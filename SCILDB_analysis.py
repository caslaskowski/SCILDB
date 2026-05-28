# %%
import pandas as pd
import os

# %%
scildb = pd.read_csv('data\scildb_enriched.csv')
scildb.drop('Unnamed: 0', axis=1, inplace=True)

# %%
cols_to_exclude = ["justiceName", "majOpinWriter", "majority", "opinion", "vote_category"]
scildb_cases = scildb.drop(columns=cols_to_exclude, errors="ignore").copy()
scildb_cases.head()

# %% 
print(len(scildb_cases))
scildb_cases.drop_duplicates(inplace=True)
print(len(scildb_cases))

# %%
unique_count_col1 = scildb_cases['caseId'].nunique()
print(f"Number of unique values in 'caseId': {unique_count_col1}")

# %% 
dupe_rows = scildb_cases[scildb_cases.duplicated(subset='caseId', keep=False)].copy()
dupe_rows.head()

# %%
# ** 9. Get frequency counts for df columns
# ** 9.a. Create count formula
def get_freq_col(df,cols):
    """
    Count the frequency of unique values in each specified column
    and return a dataframe with the results.

    Parameters:
    df (pd.DataFrame): The input dataframe.
    cols (list): A list of column names to count unique value frequencies for.

    Returns:
    pd.DataFrame: A dataframe containing columns: 'column', 'value', 'count'
    """
    value_counts = []

    for col in cols:
        if col not in df.columns:
            raise ValueError(f"Column '{col}' not found in DataFrame.")

        freq_series = df[col].value_counts(dropna=False)
        for value, count in freq_series.items():
            value_counts.append({
                'column': col,
                'value': value,
                'count': count
            })

    return pd.DataFrame(value_counts)
# ** 9.b. Count frequency of SCILDB columns
columns_to_count = ['justiceName','caseOrigin','caseOriginState',
                    'caseSource','caseSourceState', 'certReason',
                    'decisionType','issue', 'lawSupp', 'lawType',
                    'lawMinor','majOpinWriter','partyWinning',
                    'petitioner','petitionerState','precedentAlteration',
                    'respondent', 'respondentState']

scildb_freq = get_freq_col(scildb_votes, columns_to_count)

# %%
# get disposition of cases with Native party

# Categorize disposition in cases with Native party
def categorize_disposition(row):
    """
    Determines whether there was a Native party
    to the case and then retuns how the majority
    found for the Native party to the case

    Args:
        row: row of dataframe with petitioner and party winning
        columns

    Returns:
        string: Favorable, Unfavorable, Unclear
    """
    if ((row['petitioner'] == 170 and row['partyWinning'] == 1) or
        (row['respondent'] == 170 and row['partyWinning'] == 0)):
        return 'Favorable'
    elif ((row['petitioner'] == 170 and row['partyWinning'] == 0) or
          (row['respondent'] == 170 and row['partyWinning'] == 1)):
        return 'Unfavorable'
    elif row['partyWinning'] == 2:
        return 'Unclear'
    else:
        return 'Other'
# filter cases where petitioner or respondent is 170 (American Indian Tribe)
native_party_cases = scildb_votes[(scildb_votes['petitioner'] == 170) | (scildb_votes['respondent'] == 170)].copy()

native_party_cases['Disposition'] = native_party_cases.apply(categorize_disposition, axis=1)

# Drop to unique cases (1 per caseId) with majOpinWriter
native_majority_cases = native_party_cases[['caseId', 'majOpinWriter', 'Disposition']].drop_duplicates(subset='caseId')

# Count majority opinions by justice and disposition
disposition_counts = native_majority_cases.groupby(['majOpinWriter', 'Disposition']).size().reset_index(name='Count')