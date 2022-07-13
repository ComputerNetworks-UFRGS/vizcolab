import json
import pandas as pd
from ast import literal_eval

authors = pd.read_csv('output/normalized_authors.csv', delimiter=";", index_col="IDX")

authors['ID_ADD_PRODUCAO_INTELECTUAL'] = authors['ID_ADD_PRODUCAO_INTELECTUAL'].apply(literal_eval)
authors = authors.explode('ID_ADD_PRODUCAO_INTELECTUAL')

replacements = json.load(open('output/prod_id_replacements.json', 'r'))
authors['ID_ADD_PRODUCAO_INTELECTUAL'] = authors['ID_ADD_PRODUCAO_INTELECTUAL'].map(replacements).fillna(authors['ID_ADD_PRODUCAO_INTELECTUAL'])

authors.to_csv('output/final_authors.csv', sep=';')

