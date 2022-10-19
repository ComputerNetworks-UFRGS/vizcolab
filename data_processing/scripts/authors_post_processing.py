import csv
import inspect
import json
import os
import sys
import pandas as pd
from ast import literal_eval
from collections import defaultdict

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(currentdir)
sys.path.insert(0, parentdir) 

from utils import merge_count_dicts

# Load processed authors
authors = pd.read_csv('output/processed_authors_preliminary.csv', delimiter=";", index_col="IDX")
# Evaluate production IDs lists (loaded as strings from the csv) to python lists
authors['ID_ADD_PRODUCAO_INTELECTUAL'] = authors['ID_ADD_PRODUCAO_INTELECTUAL'].apply(literal_eval)

## PRODUCTION IDs REPLACEMENT
def map_prod_replacements(prod_id):
  return int(replacements[str(prod_id)]) if str(prod_id) in replacements else prod_id

# Load production IDs replacements table (for replacing merged productions with their new IDs)
replacements = json.load(open('output/prod_id_replacements.json', 'r'))
# Replace authors production IDs
authors['ID_ADD_PRODUCAO_INTELECTUAL'] = authors['ID_ADD_PRODUCAO_INTELECTUAL'].map(lambda x: [*map(map_prod_replacements, x)] if x else [])

# Load processed productions
productions = pd.read_csv('output/processed_productions.csv', delimiter=";", index_col="ID_ADD_PRODUCAO_INTELECTUAL")
productions['NM_LINHA_PESQUISA'] = productions['NM_LINHA_PESQUISA'].apply(literal_eval)

# Process authors' research lines (most common research line between it's productions)
for idx, row in authors.iterrows():
  concat_research_lines = {}
  for prod_id in row['ID_ADD_PRODUCAO_INTELECTUAL']:
    try:
      prod_research_line = productions.at[prod_id, 'NM_LINHA_PESQUISA']
      merge_count_dicts(concat_research_lines, prod_research_line)
    except Exception as e:
      print("Error merging research lines: {}".format(e))
      pass
  authors.at[idx, 'NM_LINHA_PESQUISA'] = max(concat_research_lines, key=concat_research_lines.get) if concat_research_lines else None

authors = authors.explode('ID_ADD_PRODUCAO_INTELECTUAL')
authors.reset_index()

authors.to_csv('output/final_authors.csv', sep=';')

# Get list of authors for each production
authors_per_prod = defaultdict(set)
for idx, row in authors.iterrows():
  authors_per_prod[row['ID_ADD_PRODUCAO_INTELECTUAL']].add(idx)

# Write CSV file with co-authorships data
with open('output/co_authorships.csv', 'w') as f:
  writer = csv.writer(f, delimiter=';')
  writer.writerow([ 'AUTHOR_1', 'AUTHOR_2', 'PROD_ID' ])
  for prod_id in authors_per_prod:
    authors = list(authors_per_prod[prod_id])
    for i in range(len(authors)):
      for j in range(i+1, len(authors)):
        writer.writerow([authors[i], authors[j], prod_id])