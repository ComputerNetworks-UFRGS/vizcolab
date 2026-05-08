# CAPES Dataset: Data Dictionary (2021-2024)

This document defines the schema for the two primary datasets used for Vizcolab's entity resolution and graph generation.

## 1. Dataset: PRODUCAO_AUTOR (Authors)
This dataset contains information about the authors of the intellectual productions.

### Primary Linking Key
*   **`ID_ADD_PRODUCAO_INTELECTUAL`**: Numeric identifier of the product. This is the foreign key used to join with the Productions dataset.

### Hard Identifiers (Crucial for Entity Resolution)
These numeric fields represent unique person IDs in the CAPES database. Use these as the primary source of truth for merging authors.
*   **`ID_PESSOA_DOCENTE`**: ID for faculty/professors.
*   **`ID_PESSOA_DISCENTE`**: ID for students.
*   **`ID_PESSOA_EGRESSO`**: ID for alumni.
*   **`ID_PESSOA_POS_DOC`**: ID for post-doctoral researchers.
*   **`ID_PESSOA_PART_EXTERNO`**: ID for external participants.

### Biographical & Affiliation Data (For Fuzzy Matching)
*   **`NM_AUTOR`**: Full name of the author.
*   **`NM_ABNT_AUTOR`**: Abbreviated name of the author in ABNT format.
*   **`TP_AUTOR`**: Type of author relationship with the program (e.g., Docente, Discente).
*   **`NM_ENTIDADE_ENSINO`**: Name of the Higher Education Institution the author is linked to.
*   **`SG_ENTIDADE_ENSINO`**: Acronym of the institution.

---

## 2. Dataset: PRODUCAO_INTELECTUAL (Productions)
This dataset contains the general metadata for each academic production.

### Primary Key
*   **`ID_ADD_PRODUCAO_INTELECTUAL`**: Numeric identifier of the product. Join this with the Authors dataset.

### Production Metadata
*   **`NM_PRODUCAO`**: The title or name of the production.
*   **`NM_TIPO_PRODUCAO`**: The high-level classification (Bibliográfica, Artístico-Cultural, Técnica).
*   **`NM_SUBTIPO_PRODUCAO`**: The specific subtype of the production.
*   **`AN_BASE`**: The reference year of the data collection.

### Program & Institutional Context
*   **`NM_PROGRAMA_IES`**: Name of the specific Graduate Program.
*   **`NM_ENTIDADE_ENSINO`**: Name of the Higher Education Institution.
*   **`SG_ENTIDADE_ENSINO`**: Acronym of the institution.
*   **`NM_AREA_CONCENTRACAO`**: Name of the concentration area of the program.