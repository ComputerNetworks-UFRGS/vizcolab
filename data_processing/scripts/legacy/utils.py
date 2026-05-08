import os
import pandas as pd
import re, unicodedata
from ast import literal_eval

# Data Type Optimization
# https://medium.com/bigdatarepublic/advanced-pandas-optimize-speed-and-memory-a654b53be6c2

def optimize_floats(df: pd.DataFrame) -> pd.DataFrame:
    floats = df.select_dtypes(include=['float64']).columns.tolist()
    df[floats] = df[floats].fillna(0).astype('int64')
    return df

def optimize_ints(df: pd.DataFrame) -> pd.DataFrame:
    ints = df.select_dtypes(include=['int64']).columns.tolist()
    df[ints] = df[ints].apply(pd.to_numeric, downcast='integer')
    return df

def optimize_objects(df: pd.DataFrame) -> pd.DataFrame:
    for col in df.select_dtypes(include=['object']):
        if not (type(df[col][0])==list):
            num_unique_values = len(df[col].unique())
            num_total_values = len(df[col])
            if float(num_unique_values) / num_total_values < 0.5:
                df[col] = df[col].astype('category')
    return df

def optimize(df: pd.DataFrame):
    return optimize_ints(optimize_floats(optimize_objects(df)))

## Data Normalization
# https://stackoverflow.com/questions/517923/what-is-the-best-way-to-remove-accents-normalize-in-a-python-unicode-string

def strip_accents(text):
  text = unicodedata.normalize('NFD', text)
  text = text.encode('ascii', 'ignore')
  text = text.decode("utf-8")
  return str(text)

def normalize_name(name):
  if ',' not in name:
    norm = name
  else:
    it = name.split(', ')
    it.reverse()
    norm = ' '.join(it)

  # remove accents
  norm = strip_accents(norm)

  # remove invalid chars
  norm = re.sub('[_-]', ' ', norm)
  norm = re.sub('[0-9?&#;()]', '', norm)

  # remove leading and trailing spaces
  norm = norm.strip()

  return norm

def normalize_title(text):
  norm = text

  # remove quotes if title is surrounded by quotes
  if (norm[0] == '"' and norm[-1] == '"'):
    try:
      norm = literal_eval("%s" % norm)
    except:
      norm = norm[1:-1]

  # remove leading and trailing spaces
  norm = " ".join(norm.split())
  norm = norm.replace("  ", " ")
  norm = norm.strip()

  return norm

def firstAndLastName(name):
  it = name.split(' ')
  return ' '.join([it[0], it[-1]])

## Aggregation Funtions

def count_to_dict(items):
  try:
    if type(items.iloc[0]) is dict:
      item_count = {}
      for _, item in items.iteritems():
        merge_count_dicts(item_count, item)
      return item_count
    else:
      return items.value_counts().to_dict()
  except Exception as e:
    print(e)

def merge_count_dicts(item_count, other_item_count):
  try:
    # assign empty dict to nan values
    if type(item_count) is not dict:
      item_count = {}
    if type(other_item_count) is not dict:
      other_item_count = {}
      
    # merge dicts
    for key in other_item_count:
      if key in item_count:
        item_count[key] += other_item_count[key]
      else:
        item_count[key] = other_item_count[key]
  except Exception as e:
    print('Error merging item counts: {}'.format(e))
    print(item_count)
    print(other_item_count)

def most_freq(d):
  try:
    x = -1
    k = None
    for key in d:
      if (d[key] > x and key != 'nan'):
        x = d[key]
        k = key
  except:
    return '-'

  return k if k != 'nan' else '-'

def select_by_priority(priority_list, d):
  try:
    n = next((type for type in priority_list if type in d.keys()), None)
  except:
    n = None
  return n 

def priority(priority_list):
  return lambda d: select_by_priority(priority_list, d)

## Merging Functions

# Compare two authors and return a value `n` indicating the probability that both authors are the same person
def compare_authors(author, orphan):
  n = 0

  try:
    # Match first and last name
    for name in orphan['FIRST_LAST_NAME']:
      if name in author['FIRST_LAST_NAME']: n += 2;

    # Return if there's no chance of match
    if n == 0: return 0

    # Match abnt name
    if type(author['NM_ABNT_AUTOR']) is dict and type(orphan['NM_ABNT_AUTOR']) is dict:
      for abnt in orphan['NM_ABNT_AUTOR']:
        if abnt in author['NM_ABNT_AUTOR']: n += 1;
    # Match university
    if type(author['SG_ENTIDADE_ENSINO']) is dict and type(orphan['SG_ENTIDADE_ENSINO']) is dict:
      for university in orphan['SG_ENTIDADE_ENSINO']:
        if university in author['SG_ENTIDADE_ENSINO']: n += 1;
    # Match author type
    if type(author['TP_AUTOR']) is dict and type(orphan['TP_AUTOR']) is dict:
      for author_type in orphan['TP_AUTOR']:
        if author_type in author['TP_AUTOR'] and author_type != '-': n += 1;
    # Match IES program
    if type(author['NM_PROGRAMA_IES']) is dict and type(orphan['NM_PROGRAMA_IES']) is dict:
      for ies_program in orphan['NM_PROGRAMA_IES']:
        if ies_program in author['NM_PROGRAMA_IES']: n += 1;

    return n
  except Exception as e:
    print("Error comparing authors: {}".format(e))
    return 0

def merge_authors(author, orphan_author, merge_schema):
  merged = author.copy(deep=True)
  for column in author.index.to_list():
    if column not in merge_schema or column == 'FULL_NAME': continue
    author_value = author[column]
    orphan_value = orphan_author[column]
    if isinstance(author_value, list):
      author_value.append(orphan_value)
    else:
      merge_count_dicts(author_value, orphan_value)

  return merged

## Exporting functions

def format_authors_dataframe(authors):
  dict_fields = [
    'NM_AUTOR',
    'NM_ABNT_AUTOR',
    'CD_PROGRAMA_IES',
    'NM_PROGRAMA_IES',
    'NM_AREA_CONHECIMENTO',
    'SG_ENTIDADE_ENSINO',
  ]

  # Drop helper columns
  authors = authors.drop(columns=['FULL_NAME', 'FIRST_LAST_NAME'])

  authors[['TP_AUTOR']] = authors[['TP_AUTOR']].applymap(priority(['DOCENTE', 'EGRESSO', 'PÓS-DOC', 'DISCENTE', 'PARTICIPANTE EXTERNO']))
  authors[['NM_TP_CATEGORIA_DOCENTE']] = authors[['NM_TP_CATEGORIA_DOCENTE']].applymap(priority(['PERMANENTE', 'COLABORADOR', 'VISITANTE']))
  authors[['NM_NIVEL_DISCENTE']] = authors[['NM_NIVEL_DISCENTE']].applymap(priority(['DOUTORADO PROFISSIONAL', 'BACHARELADO', 'MESTRADO', 'DOUTORADO', 'MESTRADO PROFISSIONAL']))
  authors[dict_fields] = authors[dict_fields].applymap(most_freq)

  # Add productions count to each author
  authors['PROD_COUNT'] = authors[['ID_ADD_PRODUCAO_INTELECTUAL']].applymap(len)

  # Map nan author types to 'NÃO INFORMADO'
  authors['TP_AUTOR'] = authors['TP_AUTOR'].fillna('NÃO INFORMADO')

  return authors

def export_authors_dataframe(df, filename):
  authors = format_authors_dataframe(df.copy())
  path = 'output/{}'.format(filename)

  print('⚙️ Exporting authors to {}...'.format(path))
  authors.index.name = 'IDX'
  os.makedirs('output/', exist_ok=True)
  authors.to_csv(path, sep=';')

## Other

def parse_array(s):
  try:
    lit = literal_eval(s)  
  except:
    return []

  return lit