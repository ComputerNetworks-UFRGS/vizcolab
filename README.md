# VizColab
A tool for visualizing a national-scale academic collaboration network generated from CAPES (Brazilian Federal Agency for Support and Evaluation of Graduate Education) data.

Demo: http://vizcolab.inf.ufrgs.br/

The repository is divided into two main parts:

- `data_processing/`: Contains high-performance Python scripts (using Polars) for data normalization, yearly aggregation, and automated Neo4j data loading.
- `app/`: The web application for network visualization, built with [React](https://reactjs.org/) and [3D Force-Directed Graph](https://github.com/vasturiano/react-force-graph).

---

## 🚀 Collaborative Graph Generation

### 1. Data Processing
The pipeline converts raw CAPES datasets into a normalized graph structure.

1. **Download Datasets**: Download the `datasets` directory and place it inside `data_processing/`. The provided datasets cover the 2017-2020 quadrennium. For more recent data, download files from the [CAPES Open Data Portal](https://dadosabertos.capes.gov.br/dataset/) and follow the existing directory structure.
2. **Install Dependencies**:
   ```bash
   pip install -r data_processing/requirements.txt
   ```
3. **Run the Full Pipeline**:
   Execute the master script to process productions, authors, institutions, and programs:
   ```bash
   cd data_processing
   python -m scripts.run_all
   ```
   *This script replaces the legacy Jupyter notebooks with a high-performance streaming architecture.*

4. **Generate Yearly Aggregations**:
   To enable the time-slider features in the app, generate yearly collaboration and production counts:
   ```bash
   python -m scripts.aggregate_yearly
   ```
   This generates `..._counts_per_year` properties required for the frontend queries.

### 2. Neo4j Deployment (Kubernetes)
The application requires a Neo4j instance with **APOC** and **Graph Data Science (GDS)** plugins enabled.

1. **Configuration**: Use the provided Helm values file: `kubernetes/neo4j/values.yaml`.
2. **Deploy via Helm**:
   ```bash
   helm repo add neo4j https://helm.neo4j.com/neo4j
   helm install neo4j neo4j/neo4j -f kubernetes/neo4j/values.yaml --namespace vizcolab
   ```
   The configuration in `values.yaml` automatically handles:
   - Plugin installation (APOC & GDS) via `NEO4J_PLUGINS`.
   - Security procedures and allowlists.
   - Resource allocations.

### 3. Data Import
Once Neo4j is running, use the automated loader to ingest the processed CSVs:

1. **Port Forwarding** (if running locally):
   ```bash
   kubectl port-forward svc/neo4j 7687:7687 7474:7474 -n vizcolab
   ```
2. **Run the Loader**:
   ```bash
   cd data_processing
   python -m scripts.load_neo4j
   ```
   This script will:
   - Create the `vizcolab` database.
   - Provision the `web_user` with read-only permissions.
   - Perform batch ingestion of millions of nodes and relationships using optimized Cypher `UNWIND` queries.

---

## 💻 Running the Web Application

1. **Configuration**: In the `app/` directory, create a `.env` file based on `.env.example`. Ensure the Neo4j credentials match the `web_user` created during the import phase.
2. **Build the Image**:
   ```bash
   docker build -t vizcolab-app .
   ```
3. **Run the Container**:
   ```bash
   docker run -p 8000:80 vizcolab-app
   ```
4. **Access**: Open http://localhost:8000 in your browser.

---

### 📄 Legacy Notes (Portuguese)
Original processing notebooks (`authors_grouping.ipynb`, etc.) are kept in `data_processing/` for reference but are superseded by the Polars-based `scripts/` pipeline for performance and stability.
