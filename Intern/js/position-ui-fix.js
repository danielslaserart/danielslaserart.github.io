(() => {
  const money = value => (Math.max(0, Number(value) || 0)).toFixed(2);
  let pendingAdd=false;

  document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-position-add]')) pendingAdd=true;
    else if(event.target.closest?.('[data-position-edit]')) pendingAdd=false;
  },true);

  function installStyles(){
    if(document.getElementById('positionUiFixStyles')) return;
    const style=document.createElement('style');
    style.id='positionUiFixStyles';
    style.textContent=`
      .project-position-card > summary{
        display:grid !important;
        grid-template-columns:minmax(0,1fr) !important;
        gap:10px !important;
        align-items:start !important;
      }
      .project-position-card > summary > div:first-child{
        min-width:0 !important;
      }
      .position-compact-cost{
        display:grid !important;
        grid-template-columns:repeat(3,minmax(0,1fr)) !important;
        gap:6px 10px !important;
        width:100% !important;
        max-width:100% !important;
        min-width:0 !important;
      }
      .position-compact-cost span,
      .position-compact-cost b{
        display:block !important;
        min-width:0 !important;
        white-space:normal !important;
        overflow:visible !important;
        text-overflow:clip !important;
        overflow-wrap:anywhere !important;
      }
      .position-compact-cost b{
        text-align:right !important;
      }
      .position-manual-total{
        margin-top:8px;
      }
      .position-manual-total input{
        font-weight:700;
      }
      @media (max-width:560px){
        .position-compact-cost{
          grid-template-columns:1fr 1fr !important;
        }
        .position-compact-cost b{
          grid-column:1 / -1 !important;
          text-align:left !important;
          padding-top:4px !important;
          font-size:1.05em !important;
        }
      }
    `;
    document.head.append(style);
  }

  function nextAutomaticLabel(){
    const visibleProject=[...document.querySelectorAll('dialog[open], .project-modal, .project-detail-modal')]
      .find(el=>el.querySelector?.('.project-positions'));
    const scope=visibleProject||document;
    const count=scope.querySelectorAll('.project-position-card').length;
    return `Position ${count+1}`;
  }

  function enhanceEditor(form){
    if(!form || form.dataset.positionUiFix) return;
    form.dataset.positionUiFix='1';

    const label=form.elements.label;
    const heading=form.closest('dialog')?.querySelector('h2');
    if(pendingAdd && label){
      label.value=nextAutomaticLabel();
      if(heading) heading.textContent='Position hinzufügen';
    }
    pendingAdd=false;

    const quantity=form.elements.quantity;
    const materialCost=form.elements.materialCost;
    const source=()=>new FormData(form).get('materialSource')||'manual';
    if(!quantity || !materialCost) return;

    const costLabel=materialCost.closest('label');
    let totalWrap=form.querySelector('.position-manual-total');
    if(!totalWrap){
      totalWrap=document.createElement('label');
      totalWrap.className='position-manual-total';
      totalWrap.textContent='Materialkosten gesamt (€)';
      const totalInput=document.createElement('input');
      totalInput.type='text';
      totalInput.readOnly=true;
      totalInput.tabIndex=-1;
      totalWrap.append(totalInput);
      costLabel?.insertAdjacentElement('afterend', totalWrap);
    }
    const totalInput=totalWrap.querySelector('input');

    let unitPrice=0;
    const initializeUnitPrice=()=>{
      const q=Math.max(0,Number(quantity.value)||0);
      const total=Math.max(0,Number(materialCost.value)||0);
      unitPrice=(source()==='manual' && q>0) ? total/q : total;
      if(source()==='manual') materialCost.value=money(unitPrice);
    };
    initializeUnitPrice();

    const refreshManualUi=()=>{
      const manual=source()==='manual';
      totalWrap.hidden=!manual;
      if(costLabel){
        const textNode=[...costLabel.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
        if(textNode) textNode.nodeValue=manual?'Stückpreis (€)':'Materialkosten (€)';
      }
      if(manual){
        const q=Math.max(0,Number(quantity.value)||0);
        totalInput.value=money(unitPrice*q);
      }
    };

    materialCost.addEventListener('input',()=>{
      if(source()!=='manual') return;
      unitPrice=Math.max(0,Number(materialCost.value)||0);
      refreshManualUi();
    });
    quantity.addEventListener('input',refreshManualUi);
    quantity.addEventListener('change',refreshManualUi);

    form.querySelectorAll('[name="materialSource"]').forEach(radio=>radio.addEventListener('change',()=>{
      if(source()==='manual'){
        const q=Math.max(0,Number(quantity.value)||0);
        const total=Math.max(0,Number(materialCost.value)||0);
        unitPrice=q>0?total/q:total;
        materialCost.value=money(unitPrice);
      }
      refreshManualUi();
    }));

    form.addEventListener('submit',()=>{
      if(source()==='manual'){
        const q=Math.max(0,Number(quantity.value)||0);
        materialCost.value=money(unitPrice*q);
      }
    },true);

    refreshManualUi();
  }

  function scan(){
    installStyles();
    enhanceEditor(document.getElementById('positionEditorForm'));
  }

  const start=()=>{
    scan();
    new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
