import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dearte-secret';

export const signToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '7d' },
  );

export const verifyToken = (token) => jwt.verify(token, JWT_SECRET);
