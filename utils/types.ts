export type TypedData = {
  domain: Record<string, unknown>,
  types: Record<
    string,
    {
      name: string,
      type: string
    }[]
  >,
  primaryType: string,
  message: Record<string, unknown>
};

export type AttributeInfoPair = {
  attribute: string,
  info: string
};

export type AftermarketDeviceInfos = {
  addr: string,
  attrInfoPairs: AttributeInfoPair[]
};

export type AftermarketDeviceOwnerPair = {
  aftermarketDeviceNodeId: string,
  owner: string
};

export type IdManufacturerName = {
  tokenId: string,
  name: string
};

export type SetPrivilegeData = {
  tokenId: string,
  privId: string,
  user: string,
  expires: string
};

export type ContractNameArgs = {
  name: string,
  args: (string | [])[],
  opts: {
    initializer: string | false,
    kind: 'uups' | 'transparent' | 'beacon'
  }
};

export type ContractNameArgsByNetwork = {
  [index: string]: ContractNameArgs
};

export type AddressesByNetwork = {
  [index: string]: {
    modules: {
      [index: string]: {
        address: string,
        selectors: string[]
      }
    },
    nfts: {
      [index: string]: {
        proxy: string,
        implementation: string
      }
    },
    misc: {
      [index: string]: any
    }
  }
};

export type NetworkValue = {
  [index: string]: string
};

export type GenericKeyAny = {
  [index: string]: any
};

export type ContractsSetup = {
  modules: string[],
  nfts: string[],
  upgradeableContracts: string[]
};

export type NftArgs = {
  name: string,
  args: (string | string[])[]
};
