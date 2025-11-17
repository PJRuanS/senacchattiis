<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Senac MG - Cadastro de Novo Aluno</title>
    <style>
        /* Reset e Base */
        * { margin:0; padding:0; box-sizing:border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background:#f5f5f5; color:#333; }
        a { text-decoration:none; color:#0055a5; }

        /* HEADER UNIFICADO */
        .header-services { background:#0055a5; }
        .service-nav { 
            max-width:1200px; margin:0 auto; padding:5px 20px; 
            display:flex; justify-content:flex-end; gap:5px;
        }
        .service-btn {
            background-color:transparent; color:#fff; padding:5px 8px;
            border-radius:4px; font-size:13px; font-weight:normal;
            display:flex; align-items:center; transition:background-color 0.3s;
        }
        .service-btn:hover { background-color:#003c73; }
        .service-btn::before { content: '🔗'; margin-right:4px; font-size:14px; } 

        /* Form Container */
        .form-container {
            max-width: 500px;
            margin: 50px auto;
            padding: 30px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }

        .form-container h2 {
            text-align: center;
            color: #1A4099;
            margin-bottom: 25px;
            border-bottom: 2px solid #ffcd00;
            padding-bottom: 10px;
        }

        .form-group {
            margin-bottom: 15px;
        }

        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }

        .form-group input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 16px;
        }

        .submit-btn {
            width: 100%;
            background-color: #1A4099;
            color: white;
            padding: 12px 20px;
            margin-top: 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 18px;
            transition: background-color 0.3s, transform 0.1s;
        }

        .submit-btn:hover {
            background-color: #0055a5;
            transform: translateY(-1px);
        }

        .login-link {
            text-align: center;
            margin-top: 15px;
        }

        /* Mensagem de alerta customizada */
        #custom-alert {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #f8d7da;
            color: #721c24;
            padding: 15px 25px;
            border-radius: 5px;
            border: 1px solid #f5c6cb;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            display: none;
            font-size: 16px;
        }
    </style>
</head>
<body>

    <header>
        <div class="header-services">
            <nav class="service-nav">
                <a href="index.html" class="service-btn">Portal</a>
                <a href="#" class="service-btn">Fale Conosco</a>
                <a href="login.html" class="service-btn">Área do Aluno</a>
            </nav>
        </div>
    </header>

    <main>
        <div class="form-container">
            <h2>Cadastro de Novo Aluno</h2>
            <form id="form-registro">
                <div class="form-group">
                    <label for="username">Nome de Usuário:</label>
                    <input type="text" id="username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="email">E-mail:</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="cpf">CPF (apenas números):</label>
                    <input type="text" id="cpf" name="cpf" required pattern="\d{11}" title="O CPF deve conter 11 dígitos.">
                </div>
                <div class="form-group">
                    <label for="senha">Senha:</label>
                    <input type="password" id="senha" name="senha" required>
                </div>
                <div class="form-group">
                    <label for="confirma_senha">Confirmar Senha:</label>
                    <input type="password" id="confirma_senha" name="confirma_senha" required>
                </div>
                <button type="submit" class="submit-btn">Registrar</button>
            </form>
            <div class="login-link">
                Já tem cadastro? <a href="login.html">Faça Login aqui.</a>
            </div>
        </div>
        <div id="custom-alert"></div>
    </main>

    <footer>
        <p>Central de Relacionamento: 0800 724 44 40 | Senac MG © Todos os Direitos Reservados.</p>
    </footer>

    <script>
        // Função customizada para exibir mensagens de erro/sucesso (substitui alert())
        function displayMessage(message, type = 'error') {
            const alertBox = document.getElementById('custom-alert');
            alertBox.textContent = message;
            alertBox.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
            alertBox.style.color = type === 'success' ? '#155724' : '#721c24';
            alertBox.style.border = type === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
            alertBox.style.display = 'block';
            setTimeout(() => {
                alertBox.style.display = 'none';
            }, 4000);
        }

        const formRegistro = document.getElementById('form-registro');

        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. Coleta e Validação dos dados
            const data = {
                username: document.getElementById('username').value.trim(),
                email: document.getElementById('email').value.trim(),
                cpf: document.getElementById('cpf').value.trim(),
                senha: document.getElementById('senha').value,
                confirma_senha: document.getElementById('confirma_senha').value
            };

            if (Object.values(data).some(val => val === '')) {
                displayMessage('Por favor, preencha todos os campos obrigatórios.');
                return;
            }
            if (data.senha !== data.confirma_senha) {
                displayMessage('As senhas não coincidem. Por favor, verifique.');
                return;
            }
            // Remove a confirmação antes de enviar
            delete data.confirma_senha; 

            // 2. Envio dos dados para a API Back-end
            try {
                // ROTA CORRIGIDA: Chama a rota /api/registro no próprio servidor
                const response = await fetch('/api/registro', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    // Cadastro SUCESSO
                    displayMessage(result.message + ' Redirecionando para login...', 'success');
                    setTimeout(() => {
                        window.location.href = 'login.html'; 
                    }, 2000);
                } else {
                    // Erro (ex: 400 - E-mail ou CPF duplicado)
                    displayMessage('Erro no cadastro: ' + result.message);
                }

            } catch (error) {
                console.error('Erro ao conectar com o servidor:', error);
                displayMessage('Erro de conexão. Verifique se o servidor Node.js está rodando.');
            }
        });
    </script>
</body>
</html>
