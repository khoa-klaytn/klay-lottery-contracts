// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

error KeyAlreadyExists(address key);
error KeyNotFound(address key);

/**
 * @notice
 * Adapted from https://github.com/rob-Hitchens/UnorderedKeySet
 */
library AddressSetLib {
    struct Set {
        mapping(address => uint256) keyPointers;
        address[] keyList;
    }

    function insert(Set storage self, address key) internal {
        if (exists(self, key)) revert KeyAlreadyExists(key);
        self.keyList.push(key);
        self.keyPointers[key] = self.keyList.length - 1;
    }

    function remove(Set storage self, address key) internal {
        if (!exists(self, key)) revert KeyNotFound(key);
        address keyToMove = self.keyList[length(self) - 1];
        uint rowToReplace = self.keyPointers[key];
        self.keyPointers[keyToMove] = rowToReplace;
        self.keyList[rowToReplace] = keyToMove;
        delete self.keyPointers[key];
        self.keyList.pop();
    }

    function length(Set storage self) internal view returns (uint256) {
        return (self.keyList.length);
    }

    function exists(Set storage self, address key) internal view returns (bool) {
        if (self.keyList.length == 0) return false;
        return self.keyList[self.keyPointers[key]] == key;
    }
}
