# VizColab
Uma ferramenta para visualização de uma rede de colaborações acadêmicas de escala nacional gerada a partir de dados da CAPES.

Demo: http://vizcolab.inf.ufrgs.br/

O repositório é dividido em duas partes:

- No diretório `data_processing` se encontram os notebooks Jupyter e scripts para o processamento dos dados que compõem a rede de colaborações e queries para a importação dos dados na base de dados Neo4J.
- No diretorio `app` se encontra a aplicação web de visualização da rede de colaborações construida com as bibliotecas [React](https://reactjs.org/) e [3D Forces Graph](https://github.com/vasturiano/react-force-graph).

## Geração do grafo de colaborações

### Processamento de dados

As etapas a seguir descrevem o processo de processamento dos dados brutos da CAPES para a construção da rede de colaborações.

- Faça o [download](https://infufrgsbr-my.sharepoint.com/:f:/g/personal/esfischer_inf_ufrgs_br/Esnbvcy5TtxBmFiWG9IQt1oBYyfkXbYrT5yyZR6hr3I6eA?e=oEJHtN) do diretório `datasets` e insira-o dentro do diretório `data_processing/`. Os datasets disponibilizados são referentes ao quidriênio 2017-2020. Caso queira incluir dados mais recentes, faça o download dos arquivos no [Portal de dados abertos da CAPES](https://dadosabertos.capes.gov.br/dataset/) e insira-os no diretório `data_processing/datasets/` seguindo a estrutura de diretórios e nomeação dos arquivos existente.

- Instale as dependências Python3:

  `python3 -m pip install -r requirements.txt`

- O processamento dos datesets é dividido em três notebooks Jupyter distintos, disponíveis no diretório `data_processing/`:

  1. `authors_grouping.ipynb`: processa o dataset de autores, fazendo a concatenação dos arquivos .csv, sanitização e normalização dos dados e agrupamento dos autores com múltiplas entradas no dataset. Após executado, o notebook gera dois arquivos no diretório `data_processing/output/`: `processed_authors_preliminary.csv` e `processed_authors_complete.csv`. Qualquer um deles pode ser utilizado para a geração da rede de co-autorias. Entretanto, enquanto o arquivo preliminar será gerado em minutos após as etapas de merge por `id` e por `nome do autor`, o arquivo completo provavelmente levará dias para ser gerado, já que depende do processamento complexo de merge por pontuação.

  2. `prod_grouping.ipynb`: processa o dataset de produções, fazendo a concatenação dos arquivos .csv, sanitização e normalização dos dados e agrupamento das produções com múltiplas entradas no dataset. Após executado, o notebook gera dois arquivos no diretório `data_processing/output/`: `prod_id_replacements.json` (contém um mapa para substituição dos identificadores de produções que foram agrupadas e deixaram de existir) e `processed_productions.csv` (contém a lista final de produções academicas que irá compor a rede de co-autorias).

  3. `universities_and_programs.ipynb`: processa dados de instituições de ensino superior e programas de pós-graduação. Após executado, o notebook gera dois arquivos no diretório `data_processing/output/`: `universities.csv` e `programs.csv`.

- Após a execução dos notebooks, execute o script de pós processamento disponível em `data_processing/scripts/authors_post_processing.py`. Esse script fará a substituição dos identificadores de produções que foram agrupadas e deixaram de existir, inferência dos dados de linha de pesquisa de autores e seleção das propriedades finais de cada autor, gerando os arquivos `final_authors.csv` e `co_authorships.csv` no diretório `data_processing/output/`.

Obs.: O diretório `output` contendo os arquivos resultantes do processamento de dados já realizado está disponível [aqui](https://infufrgsbr-my.sharepoint.com/:f:/g/personal/esfischer_inf_ufrgs_br/Es5ZjLLTQWBCiGga9H9SEcwBvH5ib51tivmgiFxYSVeRsg?e=dPvcqw).

### Importação dos dados para o Neo4J

- Instancie um container docker com a imagem oficial do Neo4J disponível em <https://hub.docker.com/_/neo4j>. Para isso, execute o comando:

  `docker run --publish=7474:7474 --publish=7687:7687 --volume=$HOME/neo4j/data:/data --volume=$HOME/neo4j/import:/var/lib/neo4j/import --env NEO4J_AUTH=neo4j/neo4j neo4j`

  Obs.: Se necessário, altera as portas de acesso ao Neo4J e a senha de acesso.

- Mova os arquivos gerados na etapa de processamento para o diretório `import` do container docker do Neo4J. Isso pode ser feito utilizando o comando:

  `docker cp data_processing/output/ neo4j:/var/lib/neo4j/import/`

- Acesse o Neo4J através do navegador em <http://localhost:7474> e crie um novo banco de dados.

- Execute sequencialmente as queries disponíveis no arquivo `data_processing/neo4j_queries.cql` para importação dos dados para o banco de dados.

- Crie um usuário com a role 'reader' para acesso da aplicação ao banco de dados. Por padrão, o usuário deve ser `web_user` e a senha deve ser `web_user`. Essas credenciais permitem apenas a leitura de dados e serão usados pela aplicação web para a consulta dos dados.

## Instanciação da aplicação VizColab

- No diretório `app/`, crie um arquivo `.env` com as variáveis de ambiente declaradas no arquivo de exemplo `.env.example`. Verifique se as portas e credenciais de acesso ao banco de dados estão de acordo com as configuradas no Neo4J.

- Gere a imagem docker da aplicação executando o comando:

  `docker build -t vizcolab-app .`

- Execute o container da aplicação com o comando:

  `docker run -p 8000:80 vizcolab-app`

- Acesse a aplicação em <http://localhost:8000>.
