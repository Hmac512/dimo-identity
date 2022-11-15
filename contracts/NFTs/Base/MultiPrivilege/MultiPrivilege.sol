//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./IMultiPrivilege.sol";
import "../NftBaseUpgradeable.sol";

contract MultiPrivilege is Initializable, NftBaseUpgradeable, IMultiPrivilege {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    struct PrivilegeData {
        bool enabled;
        string description;
    }

    CountersUpgradeable.Counter private _privilgeCounter;

    mapping(uint256 => PrivilegeData) public privilegeRecord;

    // tokenId => privId => user => expires at
    mapping(uint256 => mapping(uint256 => mapping(address => uint256)))
        public privilegeEntry;

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

    // TODO Documentation
    function createPrivilege(bool enabled, string calldata decription)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 privilegeId = _privilgeCounter.current();
        _privilgeCounter.increment();

        privilegeRecord[privilegeId] = PrivilegeData(enabled, decription);

        emit PrivilegeCreated(privilegeId, enabled, decription);
    }

    // TODO Documentation
    function enablePrivilege(uint256 privId)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(privId < _privilgeCounter.current(), "Invalid privilege id");
        require(!privilegeRecord[privId].enabled, "Privilege is enabled");

        privilegeRecord[privId].enabled = true;

        emit PrivilegeEnabled(privId);
    }

    // TODO Documentation
    function disablePrivilege(uint256 privId)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(privId < _privilgeCounter.current(), "Invalid privilege id");
        require(privilegeRecord[privId].enabled, "Privilege is disabled");

        privilegeRecord[privId].enabled = false;

        emit PrivilegeDisabled(privId);
    }

    // TODO Documentation
    function assignPrivilege(
        uint256 tokenId,
        uint256 privId,
        address user,
        uint256 expires
    ) external {
        require(
            _isApprovedOrOwner(msg.sender, tokenId),
            "Caller is not owner nor approved"
        );
        require(privId < _privilgeCounter.current(), "Invalid privilege id");
        require(privilegeRecord[privId].enabled, "Privilege not enabled");

        privilegeEntry[tokenId][privId][user] = expires;

        emit PrivilegeAssigned(tokenId, privId, user, expires);
    }

    // TODO Documentation
    function revokePrivilege(
        uint256 tokenId,
        uint256 privId,
        address user
    ) external {
        require(
            _isApprovedOrOwner(msg.sender, tokenId),
            "Caller is not owner nor approved"
        );
        require(
            privilegeRecord[privId].enabled &&
                privilegeEntry[tokenId][privId][user] >= block.timestamp,
            "User does not have privilege"
        );

        privilegeEntry[tokenId][privId][user] = 0;

        emit PrivilegeRevoked(tokenId, privId, user);
    }

    // TODO Documentation
    function hasPrivilege(
        uint256 tokenId,
        uint256 privId,
        address user
    ) external view returns (bool) {
        if (privilegeRecord[privId].enabled) {
            return
                privilegeEntry[tokenId][privId][user] >= block.timestamp ||
                ownerOf(tokenId) == user;
        }
        return false;
    }

    // TODO Documentation
    function privilegeExpiresAt(
        uint256 tokenId,
        uint256 privId,
        address user
    ) external view returns (uint256) {
        return privilegeEntry[tokenId][privId][user];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return
            interfaceId == type(IMultiPrivilege).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
