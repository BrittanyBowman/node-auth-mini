const massive = require('massive');

const databaseConnectionString = "postgres://uhxxanqgiryloe:7cfe779b8db1589fd140ed2d09e186f2fd2b16c0e4c86381307ac906b8011947@ec2-184-73-216-48.compute-1.amazonaws.com:5432/dcfe0lbgdodgpu?ssl=true"

massive(databaseConnectionString).then(dbInstance => {
    return dbInstance.setup.create_test_user();
}).then(() => {
    return dbInstance.query('select * from "Users"');
}).catch(err => {
    console.warn(err);
});