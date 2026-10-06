const jwt = require('jsonwebtoken');
const { TOKEN_TTL_SECONDS } = require('../constants/account.constant');

// tv (token version) lets the server end every session of a user by bumping users.token_version
exports.signToken = (user) => jwt.sign(
    { id: user.id, role_code: user.role_code, tv: user.token_version || 0 },
    process.env.JWT_SECRET_KEY,
    { expiresIn: TOKEN_TTL_SECONDS }
);
