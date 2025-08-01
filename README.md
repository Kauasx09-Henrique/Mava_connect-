MavaConnect Backend

Este é o repositório do backend do sistema MavaConnect, desenvolvido para auxiliar igrejas na gestão e acompanhamento de visitantes. Ele fornece uma API robusta e segura para o frontend da aplicação.

🚀 Tecnologias Utilizadas

•
Node.js: Ambiente de execução JavaScript assíncrono e baseado em eventos.

•
Express.js: Framework web rápido e minimalista para Node.js.

•
PostgreSQL: Sistema de gerenciamento de banco de dados relacional.

•
JWT (JSON Web Token): Para autenticação e autorização de usuários.

•
Bcrypt: Para hash de senhas.

•
Multer: Middleware para tratamento de upload de arquivos.

•
Dotenv: Para carregar variáveis de ambiente de um arquivo .env.

•
CORS: Para habilitar requisições de diferentes origens.

⚙️ Instalação

Para configurar o ambiente de desenvolvimento e instalar as dependências do projeto, siga os passos abaixo:

1.
Clone o repositório:

2.
Navegue até o diretório do projeto:

3.
Instale as dependências:

🔑 Variáveis de Ambiente

Crie um arquivo .env na raiz do projeto com as seguintes variáveis de ambiente:

Plain Text


PORT=3001
DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET="sua_chave_secreta_jwt"


•
PORT: Porta em que o servidor backend será executado (ex: 3001).

•
DATABASE_URL: String de conexão com o seu banco de dados PostgreSQL. Exemplo: postgresql://usuario:senha@host:porta/nome_do_banco.

•
JWT_SECRET: Uma chave secreta forte para assinar e verificar os JSON Web Tokens.

▶️ Como Rodar o Projeto

Após a instalação das dependências e a configuração das variáveis de ambiente, você pode iniciar o servidor backend com o seguinte comando:

Bash


npm start


O servidor estará rodando em http://localhost:PORT (onde PORT é a porta configurada no seu arquivo .env).

📂 Estrutura de Pastas

•
src/: Contém o código-fonte da aplicação.

•
src/index.js: Ponto de entrada da aplicação, onde o servidor Express é configurado e as rotas são importadas.

•
src/db.js: Configuração da conexão com o banco de dados PostgreSQL.

•
src/routes/: Contém os arquivos de rota para diferentes entidades (autenticação, usuários, visitantes).

•
src/middleware/: (Pode conter middlewares, como autenticação).



•
public/: Contém arquivos estáticos, como fotos de usuários (public/fotos).

🌐 Endpoints da API

Autenticação (/auth)

•
POST /auth/login

•
Descrição: Realiza o login do usuário e retorna um token JWT.

•
Corpo da Requisição (JSON):

•
Resposta de Sucesso (JSON):



Usuários (/api/usuarios)

•
POST /api/usuarios

•
Descrição: Cria um novo usuário (admin ou secretaria). Requer upload de arquivo para logo.

•
Corpo da Requisição (multipart/form-data):

•
nome_gf: Nome do usuário.

•
email_gf: Email do usuário.

•
senha_gf: Senha do usuário.

•
tipo_usuario: Tipo de usuário (admin ou secretaria).

•
logo: Arquivo de imagem (opcional).



•
Resposta de Sucesso (JSON): Retorna os dados do usuário criado.



•
GET /api/usuarios

•
Descrição: Lista todos os usuários cadastrados.

•
Resposta de Sucesso (JSON): Array de objetos de usuário.



•
GET /api/usuarios/:id

•
Descrição: Retorna os dados de um usuário específico pelo ID.

•
Parâmetros de Rota: id (ID do usuário).

•
Resposta de Sucesso (JSON): Objeto de usuário.



•
PUT /api/usuarios/:id

•
Descrição: Atualiza os dados de um usuário existente. Requer upload de arquivo para logo.

•
Parâmetros de Rota: id (ID do usuário).

•
Corpo da Requisição (multipart/form-data): Campos a serem atualizados (nome_gf, email_gf, tipo_usuario, senha_gf, logo).

•
Resposta de Sucesso (JSON): Retorna os dados do usuário atualizado.



•
DELETE /api/usuarios/:id

•
Descrição: Deleta um usuário pelo ID.

•
Parâmetros de Rota: id (ID do usuário).

•
Resposta de Sucesso: Status 204 (No Content).



Visitantes (/visitantes)

•
POST /visitantes

•
Descrição: Cria um novo visitante. Requer autenticação JWT.

•
Corpo da Requisição (JSON):

•
Resposta de Sucesso (JSON): Retorna os dados do visitante criado.



•
GET /visitantes

•
Descrição: Lista todos os visitantes cadastrados. Requer autenticação JWT.

•
Resposta de Sucesso (JSON): Array de objetos de visitante.



•
PUT /visitantes/:id

•
Descrição: Atualiza os dados gerais de um visitante. Requer autenticação JWT.

•
Parâmetros de Rota: id (ID do visitante).

•
Corpo da Requisição (JSON): Campos a serem atualizados (nome, telefone, email, endereco).

•
Resposta de Sucesso (JSON): Mensagem de sucesso.



•
PATCH /visitantes/:id/status

•
Descrição: Atualiza apenas o status de um visitante. Requer autenticação JWT.

•
Parâmetros de Rota: id (ID do visitante).

•
Corpo da Requisição (JSON):

•
Resposta de Sucesso (JSON): Mensagem de sucesso e dados do visitante atualizado.



•
DELETE /visitantes/:id

•
Descrição: Deleta um visitante e seu endereço associado. Requer autenticação JWT.

•
Parâmetros de Rota: id (ID do visitante).

•
Resposta de Sucesso: Status 204 (No Content).



Teste de Conexão (/api)

•
GET /api/testar-conexao

•
Descrição: Rota para testar a conexão com o servidor.

•
Resposta de Sucesso (JSON): Mensagem de status.



GFS (/api/gfs)

•
GET /api/gfs

•
Descrição: Lista todos os GFs (Grupos Familiares) cadastrados. Requer autenticação JWT.

•
Resposta de Sucesso (JSON): Array de objetos de GF.



•
POST /api/gfs

•
Descrição: Cria um novo GF. Requer autenticação JWT.

•
Corpo da Requisição (JSON):

•
Resposta de Sucesso (JSON): Retorna os dados do GF criado.



•
PUT /api/gfs/:id

•
Descrição: Atualiza o nome de um GF. Requer autenticação JWT.

•
Parâmetros de Rota: id (ID do GF).

•
Corpo da Requisição (JSON):

•
Resposta de Sucesso (JSON): Retorna os dados do GF atualizado.



•
DELETE /api/gfs/:id

•
Descrição: Deleta um GF. Requer autenticação JWT.

•
Parâmetros de Rota: id (ID do GF).

•
Resposta de Sucesso: Status 204 (No Content).



🤝 Contribuição

Contribuições são bem-vindas! Se você deseja contribuir com este projeto, siga os passos:

1.
Faça um fork do repositório.

2.
Crie uma nova branch para sua feature (git checkout -b feature/minha-feature).

3.
Faça suas alterações e commit (git commit -m 'feat: Adiciona nova feature').

4.
Envie para o seu fork (git push origin feature/minha-feature).

5.
Abra um Pull Request para a branch main deste repositório.

📄 Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

