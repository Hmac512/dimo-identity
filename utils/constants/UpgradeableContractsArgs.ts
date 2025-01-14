import { ZERO_ADDRESS } from './Misc';
import { ContractNameArgsByNetwork } from '../types';

export const upgradeableContractArgs: ContractNameArgsByNetwork = {
  DimoForwarder: {
    name: 'DimoForwarder',
    args: [
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS
    ],
    opts: {
      initializer: 'initialize',
      // eslint-disable-next-line prettier/prettier
      kind: 'uups' as const
    }
  }
};
