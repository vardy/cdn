var express = require('express');
var router = express.Router();
var Busboy = require('busboy'); // Parsing form data

var Minio = require('minio')

var minioClient = new Minio.Client({
    endPoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY
});

var mime = {
    html: 'text/html',
    txt: 'text/plain',
    gif: 'image/gif',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
};

/* GET screenshot. */
router.get('/:image_name', function(req, res, next) {
    var file_name = req.params.image_name;
    var file_extension = file_name.substring(file_name.lastIndexOf('.'));
    var type = mime[file_extension] || 'text/plain';

    minioClient.getObject(process.env.S3_BUCKET, 
        process.env.S3_DIRECTORY + req.params.image_name, 
            function(err, dataStream) {
                if (err) {
                    throw_404(err, next);
                    return;
                }

                if (dataStream == undefined) {
                    throw_404(err, next);
                    return;
                }

                dataStream.on('error', function(err) {
                    throw_500(err, next);
                    return;
                })

                res.set('Content-Type', type);
                dataStream.pipe(res);
            }
        )
});

/* POST new screenshot. */
router.post('/upload', function(req, res, next) {
    var busboy = new Busboy({ headers: req.headers });

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        minioClient.putObject(process.env.S3_BUCKET, process.env.S3_DIRECTORY + filename, file,
            function(err, etag) {
                if (err == null) {
                    res.send(200)
                } else {
                    res.send(500)
                }
            })
    });

    req.pipe(busboy);
});

function throw_500(err, next) {
    err.status = 500;
    err.message = 'Server Error, Something Went Wrong'
    next(err);
}

function throw_404(err, next) {
    err.status = 404;
    err.message = 'File Not Found'
    next(err);
}

module.exports = router;
