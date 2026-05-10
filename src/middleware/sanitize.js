function sanitize(v) {
  if (v instanceof Object) {
    for (const key in v) {
      if (/^\$/.test(key)) {
        delete v[key];
      } else {
        sanitize(v[key]);
      }
    }
  }
  return v;
}

function mongoSanitize(req, res, next) {
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
}

module.exports = mongoSanitize;
