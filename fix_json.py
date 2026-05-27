import json

def fix_json_key(filePath, oldKey,newKey):
    # Load your data
    with open(filePath, 'r') as f:
        data = json.load(f)

    # Rename oldKey to newKey
    if oldKey in data:
        data[newKey] = data.pop(oldKey)

    # Save the changes
    with open(filePath, 'w') as f:
        json.dump(data, f, indent=4)


fix_json_key("C:\Users\casla\Desktop\Code\SCILDB\justice_key.json", "Justice Name", "justiceName")