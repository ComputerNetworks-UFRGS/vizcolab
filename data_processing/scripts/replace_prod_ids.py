import csv
import json
import pandas as pd
from ast import literal_eval
from collections import defaultdict

authors = pd.read_csv('output/processed_authors_preliminary.csv', delimiter=";", index_col="IDX")

authors['ID_ADD_PRODUCAO_INTELECTUAL'] = authors['ID_ADD_PRODUCAO_INTELECTUAL'].apply(literal_eval)
authors = authors.explode('ID_ADD_PRODUCAO_INTELECTUAL')
authors.reset_index()

replacements = json.load(open('output/prod_id_replacements.json', 'r'))
authors['ID_ADD_PRODUCAO_INTELECTUAL'] = authors['ID_ADD_PRODUCAO_INTELECTUAL'].map(replacements).fillna(authors['ID_ADD_PRODUCAO_INTELECTUAL'])

authors.to_csv('output/final_authors.csv', sep=';')

# Get list of authors for each production
authors_per_prod = defaultdict(set)
for idx, row in authors.iterrows():
  authors_per_prod[row['ID_ADD_PRODUCAO_INTELECTUAL']].add(idx)

# Write CSV file with co-authorships data
with open('../output/co_authorships.csv', 'w') as f:
  writer = csv.writer(f, delimiter=';')
  writer.writerow([ 'AUTHOR_1', 'AUTHOR_2', 'PROD_ID' ])
  for prod_id in authors_per_prod:
    authors = list(authors_per_prod[prod_id])
    for i in range(len(authors)):
      for j in range(i+1, len(authors)):
        writer.writerow([authors[i], authors[j], prod_id])