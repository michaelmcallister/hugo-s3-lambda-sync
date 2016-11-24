var util = require('util');
var spawn = require('child_process').spawn;
var async = require('async');
var AdmZip = require('adm-zip');
var s3 = require("s3");
var fs = require('fs');
var https = require('follow-redirects').https;

function generateBlog(package_path, dl_url, s3_bucket, region, context) {
    async.waterfall([
    function unzipRepo(next) {
    	console.log("INFO: unzipping repo");
        var zip = new AdmZip("/tmp/master.zip");
        try {
        	zip.extractAllTo(package_path);
		fs.unlink('/tmp/master.zip');
        	next(null)
        } catch (err) {
        	next(err)
        }
    },
    function hugoBuild(next) {
        console.log("INFO: building with hugo");

		var child = spawn("./hugo", ["--source=" + package_path + "/" + s3_bucket + "-master"], {});

		child.stdout.on('data', function (data) {
			console.log("INFO: hugo-stdout: %s", data);
		});

		child.stderr.on('data', function (data) {
			console.log("ERROR: hugo-stderr: %s", data);
		});

		child.on('error', function(err) {
			console.log("hugo failed with error: %s", err);
			next(err);
		});

		child.on('close', function(code) {
			console.log("hugo exited with code: " + code);
			next(null);
		});
	},
	function s3Upload(next) {
		console.log("INFO: S3 sync");
		var s3client = s3.createClient({
			s3Options: {
				maxAsyncS3: 20,
				region: region,
			},
		});

		var params = {
			localDir: package_path + "/" + s3_bucket + "-master/public",
			deleteRemoved: true,

			s3Params: {
				Bucket: s3_bucket,
			},
		};

		var upload = s3client.uploadDir(params);
		upload.on('error', function(err) {
			console.error("Fatal: unable to sync: %s", err.stack);
			next(err);
		});

		upload.on('end', function() {
			console.log("INFO: finished s3 upload");
			next(null);
		});
	},
	], function(err) {
		if (err) console.error("Fatal %s", err)
		else console.log("INFO: succeeded");
		context.done();
	});
}

exports.handler = function(event, context) {
    //config
    var package_path = "/tmp/blog";
    var repo = event.Records[0].Sns.Message.repository.html_url;
    var dl_url = repo + "/archive/master.zip";
    var s3_bucket = event.Records[0].Sns.Message.repository.name; 
    var region = 'ap-southeast-2'


    console.log("INFO: downloading repo");

      https.get(dl_url, function(response) {
        response.on('data', function (data) {
          fs.appendFileSync('/tmp/master.zip', data);
        });
    	response.on('end', function(next) {
    		console.log("INFO: finished downloading repo");
        	generateBlog(package_path, dl_url, s3_bucket, region, context);
        });
    });
};
