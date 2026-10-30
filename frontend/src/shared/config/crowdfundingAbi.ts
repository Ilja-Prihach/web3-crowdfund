// Сгенерировано scripts/export-abi.mjs из сборки Foundry. Не редактировать вручную.
export const crowdfundingAbi = [
  {
    "type": "function",
    "name": "MAX_DESCRIPTION_LENGTH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_DURATION_DAYS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_PAGE_SIZE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_TITLE_LENGTH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "campaigns",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "creator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "fundingMode",
        "type": "uint8",
        "internalType": "enum Crowdfunding.FundingMode"
      },
      {
        "name": "title",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "description",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "goal",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalRaised",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "fundsWithdrawn",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "cancelled",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cancelCampaign",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "contributions",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createCampaign",
    "inputs": [
      {
        "name": "title",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "description",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "goal",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "fundingMode",
        "type": "uint8",
        "internalType": "enum Crowdfunding.FundingMode"
      },
      {
        "name": "durationInDays",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "donate",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getCampaignStatus",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum Crowdfunding.CampaignStatus"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getCampaigns",
    "inputs": [
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "page",
        "type": "tuple[]",
        "internalType": "struct Crowdfunding.CampaignView[]",
        "components": [
          {
            "name": "id",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "campaign",
            "type": "tuple",
            "internalType": "struct Crowdfunding.Campaign",
            "components": [
              {
                "name": "creator",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "fundingMode",
                "type": "uint8",
                "internalType": "enum Crowdfunding.FundingMode"
              },
              {
                "name": "title",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "description",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "goal",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "deadline",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "totalRaised",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "fundsWithdrawn",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "cancelled",
                "type": "bool",
                "internalType": "bool"
              }
            ]
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum Crowdfunding.CampaignStatus"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextCampaignId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "refund",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateCampaignDeadline",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "durationInDays",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawFunds",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "CampaignCancelled",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CampaignCreated",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "goal",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CampaignDeadlineUpdated",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "previousDeadline",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newDeadline",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DonationMade",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "donor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FundsWithdrawn",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RefundClaimed",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "donor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "CampaignAlreadyCancelled",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CampaignDoesNotExist",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CampaignHasEnded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CampaignIsCancelled",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CampaignIsStillActive",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DeadlineCannotChangeAfterFirstDonation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DescriptionTooLong",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DonationMustBeGreaterThanZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DurationMustBeGreaterThanZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DurationTooLong",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EmptyDescription",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EmptyTitle",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FundsAlreadyWithdrawn",
    "inputs": []
  },
  {
    "type": "error",
    "name": "GoalMustBeGreaterThanZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "GoalWasNotReached",
    "inputs": []
  },
  {
    "type": "error",
    "name": "GoalWasReached",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoContributionToRefund",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OnlyCreatorCanCancel",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OnlyCreatorCanUpdateDeadline",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OnlyCreatorCanWithdraw",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OnlyFixedDeadlineCampaignCanUpdateDeadline",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OpenEndedCampaignMustNotHaveDuration",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PageSizeMustBeGreaterThanZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PageSizeTooLarge",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RefundFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TitleTooLong",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TransferFailed",
    "inputs": []
  }
] as const;
