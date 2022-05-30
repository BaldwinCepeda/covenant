const fetch = require('node-fetch');

console.log('Getting Proposal ID...')

var id = 'QmWbpCtwdLzxuLKnMW4Vv4MPFd2pdPX71YBKPasfZxqLUS'
var name;
//api call to snapshot 
async function getSpaceID(id, spaceiD) {

    fetch('https://hub.snapshot.org/graphql', {
        method: 'POST',
      
        headers: {
          "Content-Type": "application/json"
        },
      
        body: JSON.stringify({
          query: `query Proposal {
            proposal(id: "` + id +`") {
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
          }`
        })
      })
      .then(res => res.json())
      .then(res => {
        //Snapshot space id from the returned data.proposal.space.id value.
        console.log(res.data.proposal.space.id)})
      
      
      
    

      
  
      
}




var spaceID = getSpaceID("QmWbpCtwdLzxuLKnMW4Vv4MPFd2pdPX71YBKPasfZxqLUS");
