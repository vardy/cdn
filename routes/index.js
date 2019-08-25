var express = require('express');
var router = express.Router();
var Busboy = require('busboy'); // Parsing form data

var Minio = require('minio')
var uuidv4 = require('uuid/v4');

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
router.get('/f/:image_name', function(req, res, next) {
    var file_name = req.params.image_name;
    var file_extension = file_name.substring(file_name.lastIndexOf('.'))
                                .replace(".", "");
    var type = mime[file_extension] || 'image/png';

    var data = '';
    minioClient.getObject(process.env.S3_BUCKET, 
        process.env.S3_SCREENSHOTS_DIRECTORY + req.params.image_name, 
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

/* GET document. */
router.get('/d/:doc_name', function(req, res, next) {
    var file_name = req.params.doc_name;
    var file_extension = file_name.substring(file_name.lastIndexOf('.'))
                                .replace(".", "");
    var type = mime[file_extension] || 'text/plain';

    minioClient.getObject(process.env.S3_BUCKET, 
        process.env.S3_DOCUMENTS_DIRECTORY + req.params.doc_name, 
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
    var pass = req.header('auth');
    if(pass !== process.env.AUTH) {
        res.status(401).send('Invalid authentication');
        return;
    }

    var busboy = new Busboy({ headers: req.headers });

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        switch(mimetype) {
            case 'image/png':
                upload_screenshot(fieldname, file, filename, encoding, mimetype, res);
                break;
            case 'image/jpg':
                upload_screenshot(fieldname, file, filename, encoding, mimetype, res);
                break;
            case 'image/gif':
                upload_screenshot(fieldname, file, filename, encoding, mimetype, res);
                break;
            default:
                upload_document(fieldname, file, filename, encoding, mimetype, res);
                break;
        }
    });

    req.pipe(busboy);
});

function upload_screenshot(fieldname, file, filename, encoding, mimetype, res) {
    minioClient.putObject(process.env.S3_BUCKET, process.env.S3_SCREENSHOTS_DIRECTORY + filename, file,
        function(err, etag) {
            if (err == null) {
                res.status(200).send(process.env.HOST + '/f/' + filename);
            } else {
                res.send(500);
            }
        }
    )
}

function upload_document(fieldname, file, filename, encoding, mimetype, res) {
    var id = uuidv4().substring(0, 5);
    var extension = filename.substring(filename.lastIndexOf('.'));
    filename = id + extension;
    minioClient.putObject(process.env.S3_BUCKET, process.env.S3_DOCUMENTS_DIRECTORY + filename, file,
        function(err, etag) {
            if (err == null) {
                res.status(200).send(process.env.HOST + '/d/' + filename);
            } else {
                res.send(500);
            }
        }
    )
}

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
