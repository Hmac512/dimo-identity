//SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.13;

import "../interfaces/IDimoRegistry.sol";
import "./Base/MultiPrivilege/MultiPrivilegeTransferable.sol";

contract AftermarketDeviceId is Initializable, MultiPrivilege {
    IDimoRegistry private _dimoRegistry;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string calldata name_,
        string calldata symbol_,
        string calldata baseUri_
    ) external initializer {
        _baseNftInit(name_, symbol_, baseUri_);
    }

    /// @notice Sets the DIMO Registry address
    /// @dev Only an admin can set the DIMO Registry address
    /// @param addr The address to be set
    function setDimoRegistryAddress(address addr)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(addr != address(0), "Non zero address");
        _dimoRegistry = IDimoRegistry(addr);
    }

    /// @notice Internal function to transfer a token
    /// @dev Only the token owner can transfer (no approvals)
    /// @dev Clears all privileges and beneficiaries
    /// @param from Old owner
    /// @param to New owner
    /// @param tokenId Token Id to be transferred
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        // Approvals are not accepted for now
        require(
            msg.sender == address(_dimoRegistry) || msg.sender == from,
            "Caller is not authorized"
        );

        // Resets aftermarket device beneficiary
        _dimoRegistry.setAftermarketDeviceBeneficiary(tokenId, address(0));

        super._transfer(from, to, tokenId);
    }
}
