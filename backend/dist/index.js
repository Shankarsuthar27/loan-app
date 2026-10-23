"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const auth_1 = __importDefault(require("./routes/auth"));
const loans_1 = __importDefault(require("./routes/loans"));
const app = (0, express_1.default)();
const PORT = process.env.PORT ?? 3000;
// ---- Middleware ----
app.use((0, cors_1.default)({
    origin: '*', // Restrict in production
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve uploaded receipt images statically
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// ---- Health Check ----
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ---- Routes ----
app.use('/auth', auth_1.default);
app.use('/loans', loans_1.default);
// ---- 404 Handler ----
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});
// ---- Global Error Handler ----
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: err.message ?? 'Internal server error' });
});
// ---- Start Server ----
app.listen(PORT, () => {
    console.log(`\n🚀 MiniLedger API running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
    console.log(`   Health: http://localhost:${PORT}/health\n`);
});
exports.default = app;
//# sourceMappingURL=index.js.map