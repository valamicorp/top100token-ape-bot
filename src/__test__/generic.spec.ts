import BigNumber from 'bignumber.js';

BigNumber.set({ EXPONENTIAL_AT: 80 });

describe('Misc', () => {
  it('Divide uint256 number', async () => {
    const halfBalance = new BigNumber('1123123123123123123123123').dividedToIntegerBy(2).toString();

    expect(halfBalance).toBe('561561561561561561561561');
  });
});
