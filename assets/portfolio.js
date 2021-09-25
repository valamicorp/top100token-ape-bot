const { default: BigNumber } = require("bignumber.js")


const renderPortfolio = (apeOrders) => {

    let content = '';

    apeOrders.forEach(e => {

        content += renderPortfolioCard(e);
    });

    document.getElementById('portfolioCards').innerHTML = content;

}


const renderPortfolioCard = (apeOrder) => {


   return `<div class="card text-white bg-dark mb-3" style="width: 18rem;">
   <div class="card-body">
     <h5 class="card-title">$${apeOrder.erc20Data.symbol} / ${apeOrder.erc20Data.name}</h5>
       <div style="margin-top: 1rem; margin-bottom: 1rem">
         <div class="logtailTitle">
           <span>BuyAmount</span>
           <span>${new BigNumber(apeOrder.apeAmount).dividedBy(10 ** 18).toFixed(5)}</span>
         </div>
         <div class="logtailTitle">
           <span>Token</span>
           <span>${new BigNumber(apeOrder.tokenBalance).dividedBy(10 ** apeOrder.erc20Data.decimals).toFixed(2)}</span>
         </div>
         <div class="logtailTitle">
           <span>Profit</span>
           <span>${apeOrder.currProfit}</span>
         </div>
         <div class="logtailTitle">
           <span>Status</span>
           <span>${apeOrder.status}</span>
         </div>
       </div>
     <div class="btn-group" role="group" aria-label="Basic example">
       <button type="button" onclick="StopApePortfolio(this, '${apeOrder.address}')" class="btn btn-danger">Stop</button>
       <button type="button" onclick="SellApePortfolio(this, '${apeOrder.address}')" class="btn btn-secondary">🐥 PanicSell 🧻</button>
     </div>

   </div>
 </div>`


};

const StopApePortfolio = (elem, address) => {
    ipcRenderer.send('portfolio:stop', address);
}

const SellApePortfolio = (elem, address) => {
    ipcRenderer.send('portfolio:sell', address);
}



