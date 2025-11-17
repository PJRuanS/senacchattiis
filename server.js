const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http'); // 1. IMPORTAÇÃO NECESSÁRIA PARA O SERVIDOR HTTP
const { Server } = require('socket.io'); // 2. IMPORTAÇÃO NECESSÁRIA PARA O SOCKET.IO

const app = express();
// Cria um servidor HTTP a partir do Express (essencial para o Socket.IO)
const server = http.createServer(app); 
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// ===================================
// 1. CONFIGURAÇÃO DO SOCKET.IO
// ===================================
const io = new Server(server, {
    cors: {
        // Permite conexões de qualquer origem para o Socket.IO
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// ===================================
// 2. CONEXÃO COM O MONGODB
// ===================================
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Conectado ao MongoDB Atlas com sucesso!'))
    .catch(err => console.error('❌ Erro de conexão com MongoDB:', err));

// Esquema do Usuário (Estrutura do DB)
const userSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    cpf: { type: String, required: true, unique: true }
});
const User = mongoose.model('User', userSchema);

// Middlewares
app.use(cors()); 
app.use(express.json()); 

// ===================================
// 3. ROTA DE HEALTH CHECK (/)
// ===================================
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        message: 'Servidor de API do chat está ativo e conectado ao DB.' 
    });
});

// ===================================
// 4. Rota de REGISTRO (/api/registro)
// ===================================
app.post('/api/registro', async (req, res) => {
    const { nome, cpf, email, senha } = req.body;
    
    // (Validações de dados omitidas por brevidade)

    try {
        if (await User.findOne({ $or: [{ email }, { cpf }] })) {
            return res.status(400).json({ message: 'E-mail ou CPF já cadastrado.' });
        }
        
        const newUser = new User({ nome, cpf, email, senha });
        await newUser.save();

        console.log(`Usuário registrado: ${newUser.nome}`);
        return res.status(201).json({ message: 'Cadastro realizado com sucesso!' });

    } catch (error) {
        console.error("Erro ao registrar:", error);
        return res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

// ===================================
// 5. Rota de LOGIN (/api/login)
// ===================================
app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        const user = await User.findOne({ email: email, senha: senha });

        if (user) {
            console.log(`Login bem-sucedido: ${user.nome}`);
            // NOTA: O frontend espera que a rota de login retorne o nome do usuário 
            // no campo 'nome' para salvar no localStorage, então estou ajustando.
            return res.status(200).json({ 
                message: 'Login bem-sucedido!',
                nome: user.nome, // Retorna 'nome' para ser salvo no cliente como 'senacUser'
                email: user.email 
            });
        } else {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

    } catch (error) {
        console.error("Erro ao fazer login:", error);
        return res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});


// ===================================
// 6. LÓGICA DO CHAT SOCKET.IO
// ===================================
io.on('connection', (socket) => {
    console.log(`[Socket.IO] Novo usuário conectado: ${socket.id}`);

    // Quando um usuário se junta à sala, ele envia o nome
    socket.on('user_join', (username) => {
        console.log(`[Chat] Usuário ${username} entrou.`);
        // Envia uma mensagem de sistema para TODOS OS OUTROS
        socket.broadcast.emit('system_message', `${username} entrou na sala.`);
    });

    // Quando o servidor recebe uma mensagem
    socket.on('mensagem', (data) => {
        console.log(`[Mensagem Recebida] De: ${data.user}, Texto: ${data.text}`);
        
        // CORREÇÃO CRÍTICA: Retransmite a mensagem para TODOS OS OUTROS CLIENTES (exceto o remetente).
        // Isso resolve o problema de comunicação em tempo real.
        socket.broadcast.emit('mensagem', data);
    });

    // Quando um usuário se desconecta
    socket.on('disconnect', () => {
        console.log(`[Socket.IO] Usuário desconectado: ${socket.id}`);
    });
});


// ===================================
// 7. Inicia o Servidor HTTP (e não apenas o Express)
// ===================================
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta: ${PORT}`);
    console.log(`API do Chat acessível em http://localhost:${PORT}`);
});
