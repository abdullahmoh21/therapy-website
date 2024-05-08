const ROLES_LIST = require('../config/roles_list'); 

const verifyAdmin = () => {
    return (req, res, next) => {
        console.log(`i am in verifyAdmin middleware`);
        if (!req?.role) return res.sendStatus(401);
        console.log(req.role);
        if (req.role !== ROLES_LIST.Admin) return res.sendStatus(401);

        //will only run if the user is an admin
        next();
    }
}

module.exports = verifyAdmin;