# Apertum DEX Default TokenList

This is a public repository for the officially supported tokens available in the [Apertum DEX](https://dex.apertum.io).

Contributors are welcome to submit their tokens and if verified and approved they will be added to the default list.

## Token List Structure

The token list is stored in `tokenlist/apertum-tokenlist.json` and follows a specific schema:

```json
{
  "name": "Apertum Token List",
  "version": {
    "major": 1,
    "minor": 0,
    "patch": 0
  },
  "keywords": ["apertum", "tokens", "trusted"],
  "logoURI": "https://assets.apertum.io/assets/apertum-logo.svg",
  "timestamp": "2024-02-18T12:00:00+0000",
  "tokens": [
    {
      "name": "Token Name",
      "chainId": 89898,
      "symbol": "SYMBOL",
      "decimals": 18,
      "address": "0x...",
      "logoURI": "https://..."
    }
  ]
}
```

## Validation Rules

The following rules are enforced for all token list submissions:

1. **List Properties**:
   - List name must be "Apertum Token List"
   - Keywords must include: "apertum", "tokens", "trusted"
   - List logoURI cannot be changed
   - Version must be incremented from the previous version
   - Timestamp must be current or older (not in the future)

2. **Tokens**:
   - All required properties must be present (name, chainId, symbol, decimals, address, logoURI)
   - Chain IDs are restricted to: 89898 and 2786
   - No duplicate token addresses across chains
   - No duplicate token names within the same chainId
   - No duplicate token symbols within the same chainId
   - No duplicate logoURIs within the same chainId
   - Existing tokens cannot be modified
   - Token logoURIs must exist and be accessible
   - Token addresses must be valid Ethereum addresses

3. **Dependencies**:
   - Changes to `package.json` are not allowed
   - Changes to `package-lock.json` are not allowed
   - Dependencies are managed by the repository maintainers

## How to Submit a New Token

1. Fork this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Add your new token to `tokenlist/apertum-tokenlist.json`:
   - Increment the version number
   - Update the timestamp to current time
   - Add your token with all required properties
   - Keep all existing tokens unchanged

4. Run the validation:
   ```bash
   npm run validate
   ```
   This will validate your changes against the current version in the repository.

5. Run the tests:
   ```bash
   npm test
   ```

6. Submit a Pull Request only if all validations pass

## Development

### Project Structure

- `tokenlist/apertum-tokenlist.json` - Main token list file
- `src/tokenlist.schema.json` - JSON schema for token list validation
- `src/validate.ts` - Validation script
- `src/__tests__/` - Test files
- `.github/workflows/validate.yml` - GitHub Actions workflow

### Available Scripts

- `npm run validate` - Validate the token list against all rules
- `npm test` - Run the test suite

## CI/CD and Branch Protection

This repository uses GitHub Actions for continuous integration:

1. **Automated Validation**:
   - Every PR automatically runs validation and tests
   - The PR will show a status check indicating if all validations passed
   - PRs cannot be merged until all checks pass

2. **Branch Protection Rules**:
   - The main branch is protected
   - All PRs must pass validation and tests
   - At least one review is required
   - Direct pushes to main are not allowed

3. **Required Status Checks**:
   - Token List Validation
   - Test Suite
   - These must pass before merging

## Contributing

1. Create a new branch for your changes
2. Make your changes following the validation rules
3. Run all validations and tests locally
4. Submit a Pull Request with a clear description of your changes
5. Wait for the automated checks to pass
6. Address any review comments
7. Once approved and all checks pass, your PR can be merged

## License

This project is licensed under the MIT License - see the LICENSE file for details.

It also includes the token "blacklist".