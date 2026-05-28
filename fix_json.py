import json

def fix_json_key(data, oldKey, newKey):

    for record in data:
        if oldKey in record:
            record[newKey] = record.pop(oldKey)

    return data

def remove_records(data, caseID):
    filtered = [r for r in data if r.get("caseId") != caseID]

    removed_count = len(data) - len(filtered)
    print(f"Removed {removed_count} record(s) with caseId '1988-068'")

    return filtered

def add_records(data,newRecords):
    data.extend(newRecords)

    print(f"Appended {len(newRecords)} new record(s)")

    return data

with open('data/scildb_cases.json', 'r') as f:
    caseJSON = json.load(f)

with open('data/scildb_votes.json', 'r') as f:
    votesJSON = json.load(f)

with open('data/justice_key.json', 'r') as f:
    justiceJSON = json.load(f)

with open('data/scildb_cases2.json', 'r') as f:
    newCasesJSON = json.load(f)

with open('data/scildb_votes2.json', 'r') as f:
    newVotesJSON = json.load(f)

variableNames = {"Case Name": "listName","Full Name":"fullName","Years on Court":"yearsCourt",
                 "Justice Name":"justiceName"}

justiceJSON = remove_records(justiceJSON, "1988-068")
caseJSON = remove_records(caseJSON, "1988-068")
votesJSON = remove_records(votesJSON, "1988-068")

caseJSON = add_records(caseJSON, newCasesJSON)
votesJSON = add_records(votesJSON, newVotesJSON)

for k,v in variableNames.items():
    justiceJSON = fix_json_key(justiceJSON, k, v)
    caseJSON = fix_json_key(caseJSON, k, v)
    votesJSON = fix_json_key(votesJSON, k, v)

with open('data/scildb_cases.json', 'w') as f:
    json.dump(caseJSON, f, indent=2)

with open('data/scildb_votes.json', 'w') as f:
    json.dump(votesJSON, f, indent=2)

with open('data/justice_key.json', 'w') as f:
    json.dump(justiceJSON, f, indent=2)
