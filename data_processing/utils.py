import pandas as pd
import re, unicodedata
from ast import literal_eval
from collections import Counter

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

# Data Normalization
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

# Aggregation Funtions

def count_to_dict(items):
  return items.value_counts().to_dict()

def most_frequent(items):
  values = items.dropna()
  if len(values) == 0: return None
  occurence_count = Counter(values)
  return occurence_count.most_common(1)[0][0]

def priority(priority_list):
  return lambda items: next((type for type in priority_list if type in items.array), None)