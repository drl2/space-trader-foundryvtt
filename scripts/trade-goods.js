export const TRADEGOODS = {
    CommonElectronics: {
        D66: 11,
        Availability: ["All"],
        Tons: "2d6*10",
        BasePrice: 20000,
        PurchaseDMs: {
            In: 2,
            Ht: 3,
            Ri: 1
        },
        SaleDMs: {
            Ni: 2,
            Lo: 1,
            Po: 1
        }
    },
    CommonIndustrialGoods: {
        D66: 12,
        Availability: ["All"],
        Tons: "2d6*10",
        BasePrice: "10000",
        PurchaseDMs: {
            Na: 2,
            In: 5
        },
        SaleDMs: {
            Ni: 3,
            Ag: 2
        }
    },
    CommonManufacturedGoods: {
        D66: 13,
        Availability: ["All"],
        Tons: "2d6*20",
        BasePrice: "5000",
        PurchaseDMs: {
            Na: 2,
            In: 5
        },
        SaleDMs: {
            Ni: 3,
            Hi: 2
        }
    },
    CommonRawMaterials: {
        D66: 14,
        Availability: ["All"],
        Tons: "2d6*20",
        BasePrice: "5000",
        PurchaseDMs: {
            Ag: 3,
            Ga: 2
        },
        SaleDMs: {
            Po: 2,
            Ag: 2
        }
    },
    CommonConsumables: {
        D66: 15,
        Availability: ["All"],
        Tons: "2d6*20",
        BasePrice: "500",
        PurchaseDMs: {
            Ag: 3,
            Wa: 2,
            Ga: 1,
            As: -4
        },
        SaleDMs: {
            As: 1,
            Fl: 1,
            Ic: 1,
            Hi: 1
        }
    },
    CommonOre: {
        D66: 16,
        Availability: ["All"],
        Tons: "2d6*20",
        BasePrice: "1000",
        PurchaseDMs: {
            As: 4
        },
        SaleDMs: {
            In: 3,
            Ni: 1
        }
    },
    AdvancedElectronics: {
        D66: 21,
        Availability: ["In","Ht"],
        Tons: "1d6*5",
        BasePrice: "100000",
        PurchaseDMs: {
            In: 2,
            Ht: 3
        },
        SaleDMs: {
            Ni: 1,
            Ri: 2,
            As: 3
        }
    },
    AdvancedMachineParts: {
        D66: 22,
        Availability: ["In","Ht"],
        Tons: "1d6*5",
        BasePrice: "75000",
        PurchaseDMs: {
            In: 2,
            Ht: 1
        },
        SaleDMs: {
            As: 2,
            Ni: 1
        }
    },
    AdvancedManufacturedGoods: {
        D66: 23,
        Availability: ["In","Ht"],
        Tons: "1d6*5",
        BasePrice: "100000",
        PurchaseDMs: {
            In: 1
        },
        SaleDMs: {
            Hi: 1,
            Ri: 2
        }
    },
    AdvancedWeapons: {
        D66: 24,
        Availability: ["In","Ht"],
        Tons: "1d6*5",
        BasePrice: "150000",
        PurchaseDMs: {
            Ht: 2
        },
        SaleDMs: {
            Po: 1,
            Amber: 2,
            Red: 4
        }
    },
    AdvancedVehicles: {
        D66: 25,
        Availability: ["In","Ht"],
        Tons: "1d6*5",
        BasePrice: "180000",
        PurchaseDMs: {
            Ht: 2
        },
        SaleDMs: {
            As: 2,
            Ri: 2
        }
    },
    BioChemicals: {
        D66: 26,
        Availability: ["Ag","Wa"],
        Tons: "1d6*5",
        BasePrice: "50000",
        PurchaseDMs: {
            Ag: 1,
            Wa: 2
        },
        SaleDMs: {
            In: 2
        }
    },
    CrystalsAndGems: {
        D66: 31,
        Availability: ["As","De","Ic"],
        Tons: "1d6*5",
        BasePrice: "20000",
        PurchaseDMs: {
            As: 2,
            De: 1,
            Ic: 1
        },
        SaleDMs: {
            In: 3,
            Ri: 2
        }
    },
    Cybernetics: {
        D66: 32,
        Availability: ["Ht"],
        Tons: "1d6",
        BasePrice: "250000",
        PurchaseDMs: {
            Ht: 1
        },
        SaleDMs: {
            As: 1,
            Ic: 1,
            Ri: 2
        }
    },
    LiveAnimals: {
        D66: 33,
        Availability: ["Ag","Ga"],
        Tons: "1d6*10",
        BasePrice: "10000",
        PurchaseDMs: {
            Ag: 2
        },
        SaleDMs: {
            Lo: 3
        }
    },
    LuxuryConsumables: {
        D66: 34,
        Availability: ["Ag","Ga","Wa"],
        Tons: "1d6*10",
        BasePrice: "20000",
        PurchaseDMs: {
            Ag: 2,
            Wa: 1
        },
        SaleDMs: {
            Hi: 2,
            Ri: 2
        }
    },
    LuxuryGoods: {
        D66: 35,
        Availability: ["Hi"],
        Tons: "1d6",
        BasePrice: "200000",
        PurchaseDMs: {
            Hi: 1
        },
        SaleDMs: {
            Ri: 4
        }
    },
    MedicalSupplies: {
        D66: 36,
        Availability: ["Hi","Ht"],
        Tons: "1d6*5",
        BasePrice: "50000",
        PurchaseDMs: {
            Ht: 2
        },
        SaleDMs: {
            In: 2,
            Po: 1,
            Ri: 1
        }
    },
    Petrochemicals: {
        D66: 41,
        Availability: ["De","Fl","Ic","Wa"],
        Tons: "1d6*10",
        BasePrice: "10000",
        PurchaseDMs: {
            De: 2
        },
        SaleDMs: {
            In: 2,
            Ag: 1,
            Lo: 2
        }
    },
    Pharmaceuticals: {
        D66: 42,
        Availability: ["As","De","Hi","Wa"],
        Tons: "1d6",
        BasePrice: "100000",
        PurchaseDMs: {
            As: 2,
            Hi: 1
        },
        SaleDMs: {
            Ri: 2,
            Lt: 1
        }
    },
    Polymers: {
        D66: 43,
        Availability: ["In"],
        Tons: "1d6*10",
        BasePrice: "7000",
        PurchaseDMs: {
            In: 1
        },
        SaleDMs: {
            Ri: 2,
            Ni: 1
        }
    },
    PreciousMetals: {
        D66: 44,
        Availability: ["As","De","Ic","Fl"],
        Tons: "1d6",
        BasePrice: "50000",
        PurchaseDMs: {
            As: 3,
            De: 1,
            Ic: 2
        },
        SaleDMs: {
            Ri: 3,
            In: 2,
            Ht: 1
        }
    },
    RadioActives: {
        D66: 45,
        Availability: ["As","De","Lo"],
        Tons: "1d6",
        BasePrice: "1000000",
        PurchaseDMs: {
            As: 2,
            Lo: 2
        },
        SaleDMs: {
            In: 3,
            Ht: 1,
            Ni: -2,
            Ag: -3
        }
    },
    Robots: {
        D66: 46,
        Availability: ["In"],
        Tons: "1d6*5",
        BasePrice: "100000",
        PurchaseDMs: {
            In: 1
        },
        SaleDMs: {
            Ag: 2,
            Ht: 1
        }
    },
    Spices: {
        D66: 51,
        Availability: ["Ga","Wa","De"],
        Tons: "1d6*10",
        BasePrice: "6000",
        PurchaseDMs: {
            De: 2
        },
        SaleDMs: {
            Hi: 2,
            Ri: 3,
            Po: 3
        }
    },
    Textiles: {
        D66: 52,
        Availability: ["Ag","Ni"],
        Tons: "1d6*20",
        BasePrice: "3000",
        PurchaseDMs: {
            Ag: 7
        },
        SaleDMs: {
            Hi: 3,
            Na: 2
        }
    },
    UncommonOre: {
        D66: 53,
        Availability: ["As","Ic"],
        Tons: "1d6*20",
        BasePrice: "5000",
        PurchaseDMs: {
            As: 4
        },
        SaleDMs: {
            In: 3,
            Ni: 1
        }
    },
    UncommonRawMaterials: {
        D66: 54,
        Availability: ["Ag","De","Wa"],
        Tons: "1d6*10",
        BasePrice: "20000",
        PurchaseDMs: {
            Ag: 2,
            Wa: 1
        },
        SaleDMs: {
            In: 2,
            Ht: 1
        }
    },
    Wood: {
        D66: 55,
        Availability: ["Ag","Ga"],
        Tons: "1d6*20",
        BasePrice: "1000",
        PurchaseDMs: {
            Ag: 6
        },
        SaleDMs: {
            Ri: 2,
            In: 1
        }
    },
    Vehicles: {
        D66: 56,
        Availability: ["In","Ht"],
        Tons: "1d6*10",
        BasePrice: "15000",
        PurchaseDMs: {
            In: 2,
            Ht: 1
        },
        SaleDMs: {
            Hi: 1,
            Ni: 2
        }
    },
    IllegalBiochemicals: {
        D66: 61,
        Availability: ["Ag","Wa"],
        Tons: "1d6*5",
        BasePrice: "50000",
        PurchaseDMs: {
            Wa: 2
        },
        SaleDMs: {
            In: 6
        }
    },
    IllegalCybernetics: {
        D66: 62,
        Availability: ["Ht"],
        Tons: "1d6",
        BasePrice: "250000",
        PurchaseDMs: {
            Ht: 1
        },
        SaleDMs: {
            As: 4,
            Ic: 4,
            Ri: 8,
            Amber: 6,
            Red: 6
        }
    },
    IllegalDrugs: {
        D66: 63,
        Availability: ["As","De","Hi","Wa"],
        Tons: "1d6",
        BasePrice: "100000",
        PurchaseDMs: {
            As: 1,
            De: 1,
            Ga: 1,
            Wa: 1
        },
        SaleDMs: {
            Ri: 6,
            Hi: 6
        }
    },
    IllegalLuxuries: {
        D66: 64,
        Availability: ["Ag","Ga","Wa"],
        Tons: "1d6",
        BasePrice: "50000",
        PurchaseDMs: {
            Ag: 2,
            Wa: 1
        },
        SaleDMs: {
            Ri: 6,
            Hi: 4
        }
    },
    IllegalWeapons: {
        D66: 65,
        Availability: ["In","Ht"],
        Tons: "1d6*5",
        BasePrice: "150000",
        PurchaseDMs: {
            Ht: 2
        },
        SaleDMs: {
            Po: 6,
            Amber: 8,
            Red: 10
        }
    },
    Exotics: {
        D66: 66,
        Availability: ["All"],
        Tons: "1",
        BasePrice: "1"
    }
}

export const TRADECODES = [
    "Ag",
    "As",
    "Ba",
    "De",
    "Fl",
    "Ga",
    "Hi",
    "Ht",
    "Ic",
    "In",
    "Lo",
    "Na",
    "Ni",
    "Po",
    "Ri",
    "Va",
    "Wa"
]


export const ROLLTYPES = {
    passenger: 0,
    freight: 1,
    mail: 2,
    specBuy: 3,
    specSell: 4
}

export const PASSENGERROLLS = [
    {minRoll: 1, maxRoll: 1, diceRoll: "0", diceDesc: "0"},
    {minRoll: 2, maxRoll: 3, diceRoll: "1d6", diceDesc: "1D"},
    {minRoll: 4, maxRoll: 6, diceRoll: "2d6", diceDesc: "2D"},
    {minRoll: 7, maxRoll: 10, diceRoll: "3d6", diceDesc: "3D"},
    {minRoll: 11, maxRoll: 13, diceRoll: "4d6", diceDesc: "4D"},
    {minRoll: 14, maxRoll: 15, diceRoll: "5d6", diceDesc: "5D"},
    {minRoll: 16, maxRoll: 16, diceRoll: "6d6", diceDesc: "6D"},
    {minRoll: 17, maxRoll: 17, diceRoll: "7d6", diceDesc: "7D"},
    {minRoll: 18, maxRoll: 18, diceRoll: "8d6", diceDesc: "8D"},
    {minRoll: 19, maxRoll: 19, diceRoll: "9d6", diceDesc: "9D"},
    {minRoll: 20, maxRoll: 20, diceRoll: "10d6", diceDesc: "10D"}
]

export const FREIGHTROLLS = [
    {minRoll: 1, maxRoll: 1, diceRoll: "0", diceDesc: "0"},
    {minRoll: 2, maxRoll: 3, diceRoll: "1d6", diceDesc: "1D"},
    {minRoll: 4, maxRoll: 5, diceRoll: "2d6", diceDesc: "2D"},
    {minRoll: 6, maxRoll: 8, diceRoll: "3d6", diceDesc: "3D"},
    {minRoll: 9, maxRoll: 11, diceRoll: "4d6", diceDesc: "4D"},
    {minRoll: 12, maxRoll: 14, diceRoll: "5d6", diceDesc: "5D"},
    {minRoll: 15, maxRoll: 16, diceRoll: "6d6", diceDesc: "6D"},
    {minRoll: 17, maxRoll: 17, diceRoll: "7d6", diceDesc: "7D"},
    {minRoll: 18, maxRoll: 18, diceRoll: "8d6", diceDesc: "8D"},
    {minRoll: 19, maxRoll: 19, diceRoll: "9d6", diceDesc: "9D"},
    {minRoll: 20, maxRoll: 20, diceRoll: "10d6", diceDesc: "10D"}
]

export const FREIGHTPRICES = [
    {parsecs: 1, high: 9000, middle: 6500, basic: 2000, low: 700, freight: 1000 },
    {parsecs: 2, high: 14000, middle: 10000, basic: 3000, low: 1300, freight: 1600 },
    {parsecs: 3, high: 21000, middle: 14000, basic: 5000, low: 2200, freight: 2600 },
    {parsecs: 4, high: 34000, middle: 23000, basic: 8000, low: 3900, freight: 4400 },
    {parsecs: 5, high: 60000, middle: 40000, basic: 14000, low: 7200, freight: 8500 },
    {parsecs: 6, high: 210000, middle: 130000, basic: 55000, low: 27000, freight: 32000 }
] 