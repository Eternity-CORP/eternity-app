import { setPin, verifyPin, getLockoutInfo, resetAttempts, clearPin } from '../../services/pinService';

describe('pinService', () => {
  beforeEach(async () => {
    await clearPin();
  });

  describe('Password Validation', () => {
    it('accepts numeric passwords', async () => {
      await setPin('1234');
      const ok = await verifyPin('1234');
      expect(ok.success).toBe(true);
      const bad = await verifyPin('1111');
      expect(bad.success).toBe(false);
    });

    it('accepts alphabetic passwords', async () => {
      await setPin('abcd');
      const ok = await verifyPin('abcd');
      expect(ok.success).toBe(true);
      const bad = await verifyPin('dcba');
      expect(bad.success).toBe(false);
    });

    it('accepts mixed alphanumeric passwords', async () => {
      await setPin('abc123');
      const ok = await verifyPin('abc123');
      expect(ok.success).toBe(true);
      const bad = await verifyPin('123abc');
      expect(bad.success).toBe(false);
    });

    it('accepts uppercase letters', async () => {
      await setPin('ABC123');
      const ok = await verifyPin('ABC123');
      expect(ok.success).toBe(true);
    });

    it('rejects passwords with special symbols', async () => {
      await expect(setPin('abc!123')).rejects.toThrow('Password can only contain letters and digits');
      await expect(setPin('12@34')).rejects.toThrow('Password can only contain letters and digits');
      await expect(setPin('pass#word')).rejects.toThrow('Password can only contain letters and digits');
    });

    it('rejects passwords with spaces', async () => {
      await expect(setPin('ab cd')).rejects.toThrow('Password can only contain letters and digits');
      await expect(setPin('12 34')).rejects.toThrow('Password can only contain letters and digits');
    });

    it('rejects passwords shorter than 4 characters', async () => {
      await expect(setPin('123')).rejects.toThrow('Password must be at least 4 characters');
      await expect(setPin('abc')).rejects.toThrow('Password must be at least 4 characters');
      await expect(setPin('')).rejects.toThrow('Password must be at least 4 characters');
    });

    it('accepts passwords with exactly 4 characters', async () => {
      await setPin('abcd');
      const ok = await verifyPin('abcd');
      expect(ok.success).toBe(true);
    });

    it('accepts long passwords', async () => {
      const longPassword = 'a1b2c3d4e5f6g7h8';
      await setPin(longPassword);
      const ok = await verifyPin(longPassword);
      expect(ok.success).toBe(true);
    });
  });

  describe('Lockout Mechanism', () => {
    it('locks after too many attempts', async () => {
      await setPin('1234');
      for (let i = 0; i < 5; i++) {
        const res = await verifyPin('0000');
        // last attempt should trigger lock
        if (i === 4) {
          expect(res.locked).toBe(true);
        }
      }
      const info = await getLockoutInfo();
      expect(info.locked).toBe(true);
      expect(info.remainingMs).toBeGreaterThan(0);
      await resetAttempts();
      const info2 = await getLockoutInfo();
      expect(info2.locked).toBe(false);
    });

    it('locks with alphanumeric passwords', async () => {
      await setPin('abc123');
      for (let i = 0; i < 5; i++) {
        await verifyPin('wrong');
      }
      const info = await getLockoutInfo();
      expect(info.locked).toBe(true);
    });
  });

  describe('Case Sensitivity', () => {
    it('is case-sensitive for passwords', async () => {
      await setPin('AbCd');
      const correct = await verifyPin('AbCd');
      expect(correct.success).toBe(true);

      const wrong = await verifyPin('abcd');
      expect(wrong.success).toBe(false);
    });
  });
});

