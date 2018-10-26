
import sharp from "sharp";
import fs from "fs";

class ImagesMiddleware {


  constructor() {

    this.processRequest = this.processRequest.bind(this);

  }


  async processRequest(req, res, next) {

    const {
      0: src,
      type,
    } = req.params;

    let path = `/uploads/${src}`;

    const abthPath = process.cwd() + path;


    if (fs.existsSync(abthPath)) {


      let img = await sharp(abthPath)

      let metadata;


      await img.metadata()
        .then(function (result) {

          metadata = result;

        })


      await this.resizeImg(img, type, metadata)
        .then(async () => {

          const contentType = this.getContentType(metadata)

          if (!contentType) {
            res.status(500);
            res.send("Can not get contentType");
            return;
          }

          await img
            .withMetadata()
            .toBuffer()
            .then(data => {

              res.status(200);
              res.contentType(contentType);
              res.send(data);

            })
            .catch(e => {
              console.error(e);

              res.status(500);
              res.send(e.message);

            });

        })
        .catch(error => {

          res.status(500);
          res.send(error.message);
        });



    }
    else {

      res.status(404).send('File not found');

    }


  }


  async resizeImg(img, type, metadata) {

    switch (type) {

      case 'origin':

        break;

      case 'avatar':

        img
          .resize(200, 200);

        break;



      case 'thumb':

        img
          .resize(150, 150)
          .crop(sharp.gravity.north);

        break;


      case 'small':

        img
          .resize(200, 160)
          .max()
          .crop();

        break;


      case 'middle':

        img
          .resize(700, 430)
          .max()
          .crop();

        break;


      case 'big':

        img.max();
        this.resizeMax(img, 1200, 1000, metadata);

        break;

      default:

        throw new Error("Wrong image type");
        return;
    }

    return img;
  }


  resizeMax(img, width, height, metadata) {

    img

    const {
      width: originWidth,
      height: originHeight,
    } = metadata;

    if (width < originWidth || height < originHeight) {

      img.max()
        .resize(width, height)
        .max()
        ;
    }
  }

  getContentType(metadata) {

    let contentType;

    const {
      format,
    } = metadata;

    if (format) {
      // throw new Error("Can not get format");
      contentType = `image/${format}`
    }

    return contentType;
  }

}


export default ImagesMiddleware;