//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "../Modifiers.sol";
import "../../libraries/DIMOStorage.sol";
import "../../libraries/nodes/RootStorage.sol";
import "../../libraries/nodes/VehicleStorage.sol";
import "@solidstate/contracts/token/ERC721/base/ERC721BaseInternal.sol";

contract Vehicle is ERC721BaseInternal, Modifiers {
    event AttributeAdded(string attribute);

    // ***** Admin management ***** //

    /// @notice Sets contract node type
    /// @dev Only an admin can set the node type
    /// @dev The node type can only be set once
    /// @param label The label of the node type
    function setVehicleNodeType(bytes calldata label) external onlyAdmin {
        VehicleStorage.Storage storage s = VehicleStorage.getStorage();
        require(s.nodeType == 0, "Node type already set");

        s.nodeType = uint256(keccak256(label));
    }

    /// @notice Adds an attribute to the whielist
    /// @dev Only an admin can set new controllers
    /// @param attribute The attribute to be added
    function addVehicleAttribute(string calldata attribute) external onlyAdmin {
        VehicleStorage.Storage storage s = VehicleStorage.getStorage();
        AttributeSet.add(s.whitelistedAttributes, attribute);

        emit AttributeAdded(attribute);
    }

    // ***** Interaction with nodes *****//

    /// @notice Mints a vehicle
    /// @dev Caller must be an admin
    /// @param rootNode Parent root node
    /// @param _owner The address of the new owner
    /// @param attributes List of attributes to be added
    /// @param infos List of infos matching the attributes param
    function mintVehicle(
        uint256 rootNode,
        address _owner,
        string[] calldata attributes,
        string[] calldata infos
    ) external onlyAdmin {
        DIMOStorage.Storage storage ds = DIMOStorage.getStorage();
        RootStorage.Storage storage rs = RootStorage.getStorage();
        VehicleStorage.Storage storage vs = VehicleStorage.getStorage();

        require(
            ds.records[rootNode].nodeType == rs.nodeType,
            "Invalid parent node"
        );

        ds.currentIndex++;
        uint256 newNodeId = ds.currentIndex;

        ds.records[newNodeId].parentNode = rootNode;
        ds.records[newNodeId].nodeType = vs.nodeType;

        _safeMint(_owner, newNodeId);
        _setInfo(newNodeId, attributes, infos);
    }

    /// @notice Add infos to node
    /// @dev attributes and infos arrays length must match
    /// @dev attributes must be whitelisted
    /// @param node Node where the info will be added
    /// @param attributes List of attributes to be added
    /// @param infos List of infos matching the attributes param
    function setVehicleInfo(
        uint256 node,
        string[] calldata attributes,
        string[] calldata infos
    ) external onlyAdmin {
        _setInfo(node, attributes, infos);
    }

    // ***** PRIVATE FUNCTIONS ***** //

    /// @dev Internal function to add infos to node
    /// @dev attributes and infos arrays length must match
    /// @dev attributes must be whitelisted
    /// @param node Node where the info will be added
    /// @param attributes List of attributes to be added
    /// @param infos List of infos matching the attributes param
    function _setInfo(
        uint256 node,
        string[] calldata attributes,
        string[] calldata infos
    ) private {
        require(attributes.length == infos.length, "Same length");

        DIMOStorage.Storage storage ds = DIMOStorage.getStorage();
        VehicleStorage.Storage storage s = VehicleStorage.getStorage();

        for (uint256 i = 0; i < attributes.length; i++) {
            require(
                AttributeSet.exists(s.whitelistedAttributes, attributes[i]),
                "Not whitelisted"
            );
            ds.records[node].info[attributes[i]] = infos[i];
        }
    }
}
