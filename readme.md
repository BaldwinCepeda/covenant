Bribe distribution with Snapshot delegation
This document covers instructions on assigning Covenant bribe amounts to individual voters and delegators that have participated in a bribed Snapshot vote. It requires that verifiers have already resolved the voting proposal id, bribed choice and total net payout to users (after protocol fee). This bribe distribution method supports single choice, basic and weighted Snapshot voting types.

Snapshot space strategies
Replacing <PROPOSAL_ID> with actual proposal id construct GraphQL query:

query Proposal {
proposal(id: "<PROPOSAL_ID>") {
snapshot
space {
id
network
strategies {
name
network
params
}
}
}
}
Run the above query in the Snapshot GraphQL Explorer at https://hub.snapshot.org/graphql and take note of returned JSON object.

Take note of Snapshot space id from the returned data.proposal.space.id value.

Within returned data.proposal.space.strategies array locate all the strategies that have its name parameter set to delegation and take note of their index positions within the array. Also for each identified delegation strategy take note of its network and sub-strategies by saving its params.strategies array. If there is a params.delegationSpace value set and it differs from the returned data.proposal.space.id value then it should be used instead when running such delegated strategy (otherwise default to space id from Step 3).

Determine proposal’s snapshot block number for each of delegation strategies. If the network parameter for the delegation strategy matches the Snapshot space network (data.proposal.space.network value) then it would be the same as returned data.proposal.snapshot value. Otherwise translate data.proposal.snapshot block number to the corresponding network for the delegation strategy:

Identify the timestamp for the snapshot block number (data.proposal.snapshot). In web3.js this can be done by calling (await web3.eth.getBlock(<SNAPSHOT>)).timestamp with <SNAPSHOT> replaced by actual snapshot block number.

For each of delegated strategy networks get the latest block number at or before the identified timestamp above. As a convenience one can use Snapshot block finder API at https://blockfinder.snapshot.org with query below (replacing <TIMESTAMP> and <NETWORK> with actual timestamp and network values):

query Blocks{
blocks (where: { ts: <TIMESTAMP>, network: "<NETWORK>" }) {
number
}
}
Direct bribe distribution
Replacing <PROPOSAL_ID> with actual proposal id construct GraphQL query:

query Votes {
votes (
first: 10000
skip: 0
where: {
proposal: "<PROPOSAL_ID>"
vp_state: "final"
}
) {
voter
choice
vp
vp_by_strategy
}
}
Run the above query in the Snapshot GraphQL Explorer at https://hub.snapshot.org/graphql and take note of returned JSON object. In case the proposal has more than 10000 votes increment skip parameter by 10000 and repeat the query till all the votes are covered.

From the returned data.votes array filter all votes that cover the bribed choice by inspecting their choice element. For single choice and basic voting types this consists of choice index value while for weighted voting type this is represented by choice index - voting weight object. Note that voting choice index starts from 1 and should be matched with identified bribed choice index from returned data.proposal.choices array in Snapshot vote measurement instructions (refer to linked document from voteMeasurement parameter in ancillary data). In case of weighted voting type filter the vote if any of its choice object key matches the bribed choice index and its weight value is larger than 0.

Calculate the voting power assigned to the bribed choice for each voter address from the filtered vote array above. For single choice and basic voting types this is the value of returned vp element, while for weighted voting one should multiply the vp value with relative weight assigned to the bribed choice (divide the voting weight value of bribed choice index key with the sum of all weight values from the choice object).

The sum of voting power assigned to the bribed choice from individual votes above should match the absolute value of voting score for the bribed choice as found in the matching data.proposal.scores element in the Snapshot vote measurement instructions (refer to linked document from voteMeasurement parameter in ancillary data).

Calculate bribe distribution to direct voter addresses by multiplying their bribed choice voting power (Step 4) with total net payout to users (after protocol fee) and dividing it with the absolute value of voting score for the bribed choice (Step 5).

Vote delegation
Inspect all votes covering the bribed choice (filtered results from Step 3 in the Direct bribe distribution section) and select only those votes where voting power values in the vp_by_strategy array at any of delegated strategy indices (delegated voting strategy index positions identified at Step 4 in the Snapshot space strategies section) are larger than 0.

For all of the filtered delegated votes above calculate the voting power assigned to the bribed choice split by the delegated voting strategies. One should use the same instructions as in Step 4 from the Direct bribe distribution section, but instead of vp (total voting power) use the values from vp_by_strategy array at any of delegated strategy indices.

For all the delegates (voter addresses from the filtered delegated votes above) find their delegators at the snapshot block number for all the delegation strategies:

Snapshot delegations are stored in Gnosis “Delegate Registry” contract deployed at 0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446 address on all supported chains.

One should look at the delegator parameter in latest SetDelegate event (filtered by snapshot/delegation space id and delegate address) emitted by the Delegate Registry contract till the snapshot block number unless the delegation has been cancelled in a later transaction till snapshot (ClearDelegate event). Note that also blank delegations with empty space id should be checked.

As a convenience one can use Snapshot delegations subgraph API endpoints that are listed in SNAPSHOT_SUBGRAPH_URL object at snapshot.js repository for the required delegation strategy network.

When using subgraphs above replace <DELEGATE> with delegate address, SPACE_ID with Snapshot/delegation space id (Step 4 from Snapshot space strategies section) and <SNAPSHOT> with snapshot block number (Step 5 from Snapshot space strategies section) in the following query parameter in the POST JSON data object:

{
delegations(
first: 10000
skip: 0
where: {
delegate: "<DELEGATE>"
space_in: ["", "<SPACE_ID>"]
}
block: {number: <SNAPSHOT>}
) {
delegator
}
}
If there are more than 10000 delegators per delegate then repeat above query by incrementing skip parameter in intervals of 10000.

From the list derived in Step 3 above exclude delegators that have voted directly for the proposal (voter address parameters in data.votes array before filtering for bribed choice in Step 3 of Direct bribe distribution section).

In order to calculate voting power that had been delegated by individual delegators one would need to replicate the voting strategy logic from Snapshot strategy repository for each of delegated sub-strategies (params.strategies array from Step 4 in the Snapshot space strategies section) against all the delegator addresses at snapshot block number on the delegation chain. As convenience one can use getScores function from snapshot.js library as documented here with following parameter values:

space: Snapshot space id as resolved in Step 3 from Snapshot space strategies section;
strategies: sub-strategies for the evaluated delegation strategy (params.strategies array from Step 4 in the Snapshot space strategies section);
network: chain id corresponding to proposal’s snapshot block number: this should be set to network parameter for the delegation strategy if present or fall back to data.proposal.space.network value (Step 5 from Snapshot space strategies section) ;
voters: array containing delegator addresses that have not voted directly (Step 4 above);
blockNumber: proposal’s snapshot block number: normally this should be set to data.proposal.snapshot value, but in case delegated strategy network parameter differs from data.proposal.space.network value this should be translated to correspond to delegated strategy’s chain id (see details in Step 5 from Snapshot space strategies section).
The sum of delegators’ voting power derived in Step 5 above grouped by their delegates and delegation strategy should match corresponding delegates voting power for each of delegated strategy as found in Step 1 of this section.

Calculate the delegator’s voting power that was assigned to the bribed choice: multiply delegators’ total voting power per delegated strategy (Step 5) with corresponding delegate’s voting power assigned to the bribed choice within the same delegated strategy (Step 2) and divide by delegates’ total voting power in that delegation strategy (Step 6).

Calculate gross bribe distribution to delegator addresses by multiplying their bribed choice voting power (Step 7) with total net payout to users (after protocol fee) and dividing it with the absolute value of voting score for the bribed choice (Step 5 in Direct bribe distribution section).

Redistribute bribe amounts to delegators (Step 8) from delegates (Step 6 in Direct bribe distribution section) by withholding 20% delegation fee.

Before resolving bribe amount payout table to individual recipients (including delegators) they should be grouped by recipient addresses and rounded so that total bribe payout amount to all recipients matches total net payout to users (after protocol fee). When applying such rounding verifiers must respect the passed errorMargin parameter from ancillary data or default to 0.0001 if none was provided.
