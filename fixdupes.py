import pandas as pd

scildb = pd.read_csv('data/scildb_final2.csv')
scildbv = pd.read_csv('data/scdbv_filtered2.csv')

scildb.drop_duplicates(inplace=True)
scildbv.drop_duplicates(inplace=True)

scildb.to_json('data/scildb_cases_clean.json', orient='records', indent=2)
scildbv.to_json('data/scildb_votes_clean.json', orient='records', indent=2)