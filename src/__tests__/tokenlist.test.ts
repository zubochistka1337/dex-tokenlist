import { validateTokenList } from '../validate';

describe('Token List Validation', () => {
  it('should pass all validations', async () => {
    await expect(validateTokenList()).resolves.not.toThrow();
  });
}); 