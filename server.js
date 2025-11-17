const { Server } = require('socket.io'); 

const app = express();
// Configurações de Ambiente (Remoção de Duplicatas)

// Configurações de Ambiente
const PORT = process.env.PORT || 3000; 
const MONGODB_URI = process.env.MONGODB_URI || 'SUA_URI_DO_MONGODB_AQUI'; // Use uma URI local se não estiver no Render
// Use a variável de ambiente do Render, ou uma URL local de fallback (mude 'SUA_URI_DO_MONGODB_AQUI')
const MONGODB_URI = process.env.MONGODB_URI || 'SUA_URI_DO_MONGODB_AQUI'; 

// Cria um servidor HTTP a partir do Express (essencial para o Socket.IO)
// Cria o servidor HTTP a partir do Express (Necessário para o Socket.IO)
const server = http.createServer(app); 

// ===================================
// 1. DEFINIÇÃO DO MODELO MONGOOSE
// (ISSO ESTAVA FALTANDO!)
// 1. DEFINIÇÃO DO MODELO MONGOOSE (User Model)
// ===================================
const UserSchema = new mongoose.Schema({
nome: { type: String, required: true },
cpf: { type: String, required: true, unique: true },
email: { type: String, required: true, unique: true },
    senha: { type: String, required: true }, // ATENÇÃO: Em produção, use bcrypt para hash de senha!
    // Adicionando um saldo inicial para o simulador
    // ATENÇÃO: Em um projeto real, 'senha' DEVE ser hasheada com bcrypt!
    senha: { type: String, required: true }, 
    // Saldo inicial para o simulador
saldo: { type: Number, default: 1000.00 }
});
const User = mongoose.model('User', UserSchema);
@@ -44,13 +46,14 @@ app.use(express.json());
// ===================================
const io = new Server(server, {
cors: {
        // Permite conexões de qualquer origem (necessário para o Front-end)
origin: "*", 
methods: ["GET", "POST"]
}
});

// ===================================
// 5. ROTAS DE AUTENTICAÇÃO
// 5. ROTAS DE AUTENTICAÇÃO E HEALTH CHECK
// ===================================

// ROTA DE HEALTH CHECK (/)
@@ -64,7 +67,8 @@ app.get('/', (req, res) => {

// Rota de REGISTRO (/api/registro)
app.post('/api/registro', async (req, res) => {
    const { nome, cpf, email, senha } = req.body;
    // Nota: O CPF é obrigatório no modelo
    const { nome, cpf, email, senha } = req.body; 

try {
if (await User.findOne({ $or: [{ email }, { cpf }] })) {
@@ -74,7 +78,12 @@ app.post('/api/registro', async (req, res) => {
const newUser = new User({ nome, cpf, email, senha });
await newUser.save();

        res.status(201).json({ message: 'Usuário registrado com sucesso!', userId: newUser._id, saldoInicial: newUser.saldo });
        res.status(201).json({ 
            message: 'Usuário registrado com sucesso!', 
            nome: newUser.nome, 
            email: newUser.email,
            saldo: newUser.saldo 
        });
} catch (error) {
console.error('Erro no registro:', error);
res.status(500).json({ message: 'Erro interno no servidor ao registrar.' });
@@ -86,12 +95,12 @@ app.post('/api/login', async (req, res) => {
const { email, senha } = req.body;

try {
        // Busca o usuário pelo e-mail
const user = await User.findOne({ email: email });

        if (user && user.senha === senha) { // ATENÇÃO: Comparação direta, use hash em produção!
        if (user && user.senha === senha) { 
console.log(`Login bem-sucedido: ${user.nome}`);
            // Retorna os dados necessários para o frontend
            
            // Retorna dados para o Front-end
return res.status(200).json({ 
message: 'Login bem-sucedido!',
nome: user.nome, 
@@ -121,8 +130,8 @@ io.on('connection', (socket) => {

socket.on('mensagem', (data) => {
console.log(`[Mensagem Recebida] De: ${data.user}, Texto: ${data.text}`);
        // Retransmite a mensagem para TODOS OS CLIENTES (incluindo o remetente)
        io.emit('mensagem', data); // Use io.emit para enviar para todos, incluindo o remetente, se for um chat global.
        // io.emit envia a mensagem para TODOS os clientes conectados (global chat)
        io.emit('mensagem', data); 
});

socket.on('disconnect', () => {
