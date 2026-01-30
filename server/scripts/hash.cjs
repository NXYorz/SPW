const bcrypt = require('bcryptjs');

bcrypt.hash('spw-admin', 10).then((h) => {
  console.log(h);
});
