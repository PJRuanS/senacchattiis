const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http'); 
const { Server } = require('socket.io'); 

const app = express();
// Configurações de Ambiente (Remoção de Duplicatas)
const PORT = process.env.PORT || 3000; 
const MONGODB_URI = process.env.MONGODB_URI || 'SUA_URI_DO_MONGODB_AQUI'; // Use uma URI local se não estiver no Render

// Cria um servidor HTTP a partir do Express (essencial para o Socket.IO)
const server = http.createServer(app); 

// ===================================
// 1. DEFINIÇÃO DO MODELO MONGOOSE
// (ISSO ESTAVA FALTANDO!)
// ===================================
const UserSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    cpf: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true }, // ATENÇÃO: Em produção, use bcrypt para hash de senha!
    // Adicionando um saldo inicial para o simulador
    saldo: { type: Number, default: 1000.00 }
});
const User = mongoose.model('User', UserSchema);

// ===================================
// 2. CONEXÃO COM O MONGODB
// ===================================
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Conectado ao MongoDB Atlas com sucesso!'))
    .catch(err => console.error('❌ Erro na conexão com o MongoDB:', err));

// ===================================
// 3. CONFIGURAÇÃO DE MIDDLEWARES
// ===================================
app.use(cors());
app.use(express.json()); 

// ===================================
// 4. CONFIGURAÇÃO DO SOCKET.IO
// ===================================
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// ===================================
// 5. ROTAS DE AUTENTICAÇÃO
// ===================================

// ROTA DE HEALTH CHECK (/)
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'Servidor Senac Simulador está ativo!',
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'
    });
});

// Rota de REGISTRO (/api/registro)
app.post('/api/registro', async (req, res) => {
    const { nome, cpf, email, senha } = req.body;

    try {
        if (await User.findOne({ $or: [{ email }, { cpf }] })) {
            return res.status(400).json({ message: 'E-mail ou CPF já cadastrado.' });
        }

        const newUser = new User({ nome, cpf, email, senha });
        await newUser.save();

        res.status(201).json({ message: 'Usuário registrado com sucesso!', userId: newUser._id, saldoInicial: newUser.saldo });
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ message: 'Erro interno no servidor ao registrar.' });
    }
});

// Rota de LOGIN (/api/login)
app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        // Busca o usuário pelo e-mail
        const user = await User.findOne({ email: email });

        if (user && user.senha === senha) { // ATENÇÃO: Comparação direta, use hash em produção!
            console.log(`Login bem-sucedido: ${user.nome}`);
            // Retorna os dados necessários para o frontend
            return res.status(200).json({ 
                message: 'Login bem-sucedido!',
                nome: user.nome, 
                email: user.email,
                saldo: user.saldo
            });
        } else {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno no servidor ao logar.' });
    }
});


// ===================================
// 6. LÓGICA DO CHAT SOCKET.IO
// ===================================
io.on('connection', (socket) => {
    console.log(`[Socket.IO] Novo usuário conectado: ${socket.id}`);

    socket.on('user_join', (username) => {
        console.log(`[Chat] Usuário ${username} entrou.`);
        socket.broadcast.emit('system_message', `${username} entrou na sala.`);
    });

    socket.on('mensagem', (data) => {
        console.log(`[Mensagem Recebida] De: ${data.user}, Texto: ${data.text}`);
        // Retransmite a mensagem para TODOS OS CLIENTES (incluindo o remetente)
        io.emit('mensagem', data); // Use io.emit para enviar para todos, incluindo o remetente, se for um chat global.
    });

    socket.on('disconnect', () => {
        console.log(`[Socket.IO] Usuário desconectado: ${socket.id}`);
    });
});


// ===================================
// 7. Inicia o Servidor HTTP
// ===================================
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta: ${PORT}`);
});
