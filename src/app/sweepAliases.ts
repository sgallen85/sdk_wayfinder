
export interface SweepAlias {
  [sid: string]: string;
}

const robinsonHall: SweepAlias = {
  "36642185cf3f481897967d749003d683": "Great Hall",
  "e282bc9e7ae94a58aa624c4679e71946": "105",
  "03dbddfa78074195ad605033e1a5ea88": "106",
  "ecf49427817f4ad2a18971bd836f577a": "107",
  "233c8a90b0d44803b451cc18c2beb2ac": "125: History Department Conference Room",
  "7f3f51d4c0b9448f9e5c78a9882fe912": "222",
  "5c19c240375d4d04a6c9ca790a35fa02": "223",
  "c2096fe91b2543f78ca9d95070e78e63": "225: History Department Graduate Lounge",
  "1b11bb808949421ba32142f4c48b9823": "B21: Warren Center Conference Room",
};

const scu: SweepAlias = {
  "6d80bf2d4e71453aa0134fc61c2d8102": "Entrance",
  "ff56dea1f04c4ab08d2121d805cf9be2": "Sports Performance Center",
  "857ceb1a450d46099b6b9c66f81bd644": "Sobrato Gymnasium",
  "8ddd9373572b4ae7a6c7063a9dacdc3b": "Rambis Family Gymnasium",
  "cadbfa305b77449c8a5907fc2b9d1d0e": "Stevens Academic Center",
  "6c67c4e49ee440ad9895872922a12a32": "Sports Medicine Center",
}

const MatterportChicago: SweepAlias = {
   "58aed27956224b6cb5b1d9e29cea9f87": "Putting Green"
}

const GPI: SweepAlias = {
  "s2wb6w4ubt4az5w6dskhdqiab": "Turn-Up Controls",
  "ff56dea1f04c4ab08d2121d805cf9be2": "MCC",
  "857ceb1a450d46099b6b9c66f81bd644": "Basement",
}

export const sweepAliases: any = {
  "GycExKiYVFp": robinsonHall,
  "JYz9SNonEqa": scu,
  "6gR9HhhJJTc": MatterportChicago
  ""5zrTVSLfpMw": GPI
}
