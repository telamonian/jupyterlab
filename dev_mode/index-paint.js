registerPaint(
  'labicon',
  class {
    static get inputProperties() {
      return [
        '--jp-inverse-layout-color0',
        '--jp-inverse-layout-color1',
        '--jp-inverse-layout-color2',
        '--jp-inverse-layout-color3',
        '--jp-inverse-layout-color4'
      ];
    }
    paint(ctx, geom, properties) {
      let opacity = properties.get('--background-opacity').toString();
      let transform = properties.get('--background-rotate').value;
      let filters = properties.get('--background-filter').toString();

      let image = properties.get('list-style-image');

      ctx.globalAlpha = opacity;
      ctx.filter = filters;

      // apply rotation from center
      ctx.translate(geom.width / 2, geom.height / 2);
      ctx.rotate((transform * Math.PI) / 180);
      ctx.translate(-geom.width / 2, -geom.height / 2);

      // then draw
      ctx.drawImage(image, 0, 0, geom.width, geom.height);

      //also, if transform, draw pattern (very naive solution)
      if (transform > 0 && transform < 360) {
        ctx.drawImage(image, 0, -geom.height, geom.width, geom.height);
        ctx.drawImage(image, geom.width, 0, geom.width, geom.height);
        ctx.drawImage(image, -geom.width, 0, geom.width, geom.height);
        ctx.drawImage(image, 0, geom.height, geom.width, geom.height);
      }
    }
  }
);
