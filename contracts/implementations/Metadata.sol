//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./shared/Modifiers.sol";
import "@solidstate/contracts/token/ERC721/base/ERC721BaseStorage.sol";
import "@solidstate/contracts/token/ERC721/metadata/ERC721MetadataStorage.sol";

contract Metadata is Modifiers {
    using ERC721BaseStorage for ERC721BaseStorage.Layout;

    function initialize(
        string calldata _name,
        string calldata _symbol,
        string calldata _baseURI
    ) external onlyAdmin {
        ERC721MetadataStorage.Layout storage s = ERC721MetadataStorage.layout();
        s.name = _name;
        s.symbol = _symbol;
        s.baseURI = _baseURI;
    }

    function setBaseURI(string calldata _baseURI) external onlyAdmin {
        ERC721MetadataStorage.layout().baseURI = _baseURI;
    }

    function setTokenURI(uint256 tokenId, string calldata _tokenURI)
        external
        onlyAdmin
    {
        require(
            ERC721BaseStorage.layout().exists(tokenId),
            "NFT does not exist"
        );
        ERC721MetadataStorage.layout().tokenURIs[tokenId] = _tokenURI;
    }
}
