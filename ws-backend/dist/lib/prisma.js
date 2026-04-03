"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
//@ts-ignore
const globalForPrisma = globalThis;
//@ts-ignore
exports.prisma = globalForPrisma.prisma ?? new client_1.PrismaClient();
if (process.env.NODE_ENV !== 'production') {
    //@ts-ignore
    globalForPrisma.prisma = exports.prisma;
}
//# sourceMappingURL=prisma.js.map