const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Pacote para MongoDB
const http = require('http'); // 1. IMPORTAÇÃO NECESSÁRIA PARA O SERVIDOR HTTP
const { Server } = require('socket.io'); // 2. IMPORTAÇÃO NECESSÁRIA PARA O SOCKET.IO

const app = express();
// Configura a porta para usar a variável do Render (process.env.PORT), ou 3000 localmente
const PORT = process.env.PORT || 3000; 
// ===================================
// 1. CHAVE DE CONEXÃO DIRETA
// IMPORTANTE: MONGODB_URI agora usa o valor fixo.
// ===================================
const MONGODB_URI = "mongodb+srv://pjruans:12345@cluster0.u2ukjas.mongodb.net/?appName=Cluster0"; 

// Cria um servidor HTTP a partir do Express (essencial para o Socket.IO)
const server = http.createServer(app); 

// ===================================
// 2. CONFIGURAÇÃO DO SOCKET.IO
// ===================================
const io = new Server(server, {
    cors: {
        // Permite conexões de qualquer origem para o Socket.IO
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// ===================================
// 3. MODELO DE USUÁRIO (SCHEMA)
// Você precisa definir o Schema para o Mongoose usar o User
// ===================================
const userSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    cpf: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true }, // Em produção, a senha deve ser hasheada (ex: bcrypt)
});
const User = mongoose.model('User', userSchema);


// ===================================
// 4. CONEXÃO COM O MONGODB
// ===================================
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Conectado ao MongoDB Atlas com sucesso!'))
    .catch(err => {
        console.error('❌ ERRO ao conectar com o MongoDB Atlas:', err.message);
        // Garante que o servidor não inicie se não houver conexão com o DB
        process.exit(1); 
    });

// ===================================
// 5. MIDDLEWARES
// ===================================
app.use(cors());
app.use(express.json()); 

// ===================================
// 6. ROTA DE HEALTH CHECK (/)
// Para verificar se o servidor está no ar
// ===================================
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'API Online e Operacional', 
        message: 'Servidor rodando e conectado ao MongoDB.'
    });
});

// ===================================
// 7. Rota de REGISTRO (/api/registro)
// ===================================
app.post('/api/registro', async (req, res) => {
    const { nome, cpf, email, senha } = req.body;

    // (Validações de dados omitidas por brevidade)

    try {
        // Verifica se o e-mail ou CPF já existem no banco de dados
        if (await User.findOne({ $or: [{ email }, { cpf }] })) {
            return res.status(400).json({ message: 'E-mail ou CPF já cadastrado.' });
        }

        // Cria e salva o novo usuário no DB
        const newUser = new User({ nome, cpf, email, senha });
        await newUser.save();

        res.status(201).json({ 
            message: 'Usuário registrado com sucesso!', 
            user: { nome, email } 
        });

    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao registrar.' });
    }
});

// ===================================
// 8. Rota de LOGIN (/api/login)
// ===================================
app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;

    // (Validações de campos vazios omitidas)

    try {
        // Busca o usuário pelo e-mail e senha no MongoDB
        const user = await User.findOne({ email: email, senha: senha });

        if (user) {
            // Login bem-sucedido
            console.log(`Login bem-sucedido: ${user.nome}`);
            return res.status(200).json({ 
                message: 'Login bem-sucedido!',
                nome: user.nome, // Retorna 'nome' para ser salvo no cliente como 'senacUser'
                email: user.email 
            });
        } else {
            // Usuário não encontrado ou senha incorreta
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

    } catch (error) {
        console.error('Erro ao realizar login:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao tentar logar.' });
    }
});

// ===================================
// 9. LÓGICA DO CHAT SOCKET.IO
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
        
        // Retransmite a mensagem para TODOS OS OUTROS CLIENTES (incluindo o remetente)
        // Use 'io.emit' para todos, ou 'socket.broadcast.emit' para todos exceto o remetente
        io.emit('mensagem', data);
    });

    // Quando um usuário se desconecta
    socket.on('disconnect', () => {
        console.log(`[Socket.IO] Usuário desconectado: ${socket.id}`);
    });
});


// ===================================
// 10. Inicia o Servidor HTTP (e não apenas o Express)
// ===================================
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta: ${PORT}`);
    console.log(`API do Chat acessível em http://localhost:${PORT}`);
});
