'use client'

import React, { useState } from 'react';
import { Box, IconButton, Tooltip } from '@chakra-ui/react';
import { CopyIcon } from '@chakra-ui/icons';


const CopyableAddress = ({ address }) => {
  const [isCopied, setIsCopied] = useState(false);

  const shortenAddress = (addr) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address: ', err);
    }
  };

  return (
    <Box display="flex" alignItems="center">
      {shortenAddress(address)}
      <Tooltip label={isCopied ? "Copied!" : "Copy address"} placement="top">
        <IconButton
          aria-label="Copy address"
          icon={<CopyIcon />}
          size="sm"
          ml={2}
          onClick={handleCopy}
        />
      </Tooltip>
    </Box>
  );
};

export default CopyableAddress;