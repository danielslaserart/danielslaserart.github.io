export const OFFER_PDF_TEMPLATE = "letterhead";
export const OFFER_PDF_BACKGROUND_URL = "./assets/pdf/briefpapier-daniels-laser-art.pdf";

export const OFFER_PDF_LAYOUT = Object.freeze({
  pageWidthMm: 210,
  pageHeightMm: 297,
  contentLeftMm: 20,
  contentRightMm: 20,
  headerSafeBottomMm: 42,
  senderTopMm: 56.2,
  addressTopMm: 64.5,
  addressWidthMm: 85,
  addressHeightMm: 27,
  documentTitleTopMm: 47.2,
  documentTitleRightMm: 20,
  detailsTopMm: 93,
  tableTopMm: 122,
  continuationTopMm: 28,
  foldMarkYMm: 105,
  foldMarkLengthMm: 4,
  footerTopMm: 272,
  footerBottomMm: 289
});

export const OFFER_FOOTER_LAYOUT = Object.freeze({
  leftColumnX: 20,
  contactColumnX: 70,
  bankColumnX: 120,
  pageNumberRightMm: 20,
  footerTopY: 275,
  lineHeightMm: 3.25,
  headingFontSize: 6.2,
  textFontSize: 6.2,
  leftColumnWidthMm: 45,
  contactColumnWidthMm: 46,
  bankColumnWidthMm: 62,
  pageNumberTopY: 288
});

const mm=value=>value*72/25.4;
const clean=value=>String(value??"").replace(/\s+/g," ").trim();
const lines=value=>String(value??"").split(/\r?\n/).map(clean).filter(Boolean);
const money=value=>`${Number(value||0).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €`;
const quantity=value=>Number(value||0).toLocaleString("de-DE",{minimumFractionDigits:0,maximumFractionDigits:2});
const safeFilePart=value=>clean(value).normalize("NFKD").replace(/[^\w\s.-]/g,"").replace(/\s+/g,"_").replace(/_+/g,"_").replace(/^_|_$/g,"")||"Kunde";

function wrapText(text,font,size,maxWidth){
  const paragraphs=String(text??"").split(/\r?\n/);
  const output=[];
  paragraphs.forEach((paragraph,index)=>{
    const words=paragraph.trim().split(/\s+/).filter(Boolean);
    if(!words.length){output.push("");return}
    let line="";
    words.forEach(word=>{
      const candidate=line?`${line} ${word}`:word;
      if(font.widthOfTextAtSize(candidate,size)<=maxWidth)line=candidate;
      else{
        if(line)output.push(line);
        if(font.widthOfTextAtSize(word,size)<=maxWidth)line=word;
        else{
          let part="";
          [...word].forEach(char=>{
            const next=part+char;
            if(font.widthOfTextAtSize(next,size)<=maxWidth)part=next;
            else{if(part)output.push(part);part=char}
          });
          line=part;
        }
      }
    });
    if(line)output.push(line);
  });
  return output;
}

function drawTopText(page,text,{x,top,size,font,color,maxWidth,lineHeight=size*1.25}){
  const pageHeight=page.getHeight();
  const wrapped=maxWidth?wrapText(text,font,size,maxWidth):String(text).split(/\r?\n/);
  wrapped.forEach((line,index)=>page.drawText(line,{x,y:pageHeight-top-size-index*lineHeight,size,font,color}));
  return wrapped.length*lineHeight;
}

function drawRightTopText(page,text,{right,top,size,font,color}){
  const width=font.widthOfTextAtSize(text,size);
  drawTopText(page,text,{x:page.getWidth()-right-width,top,size,font,color});
}

function normalizeOffer(data){
  const positions=Array.isArray(data.positions)&&data.positions.length?data.positions:[{
    description:data.description||data.projectName||"Individuelle Anfertigung",
    quantity:data.quantity||1,
    unit:data.unit||"Stk.",
    unitPrice:data.unitPrice??data.totalPrice??0,
    total:data.totalPrice??data.unitPrice??0
  }];
  return {
    offerNumber:clean(data.offerNumber)||"A-2026-0001",
    date:clean(data.date)||new Date().toLocaleDateString("de-DE"),
    validUntil:clean(data.validUntil),
    customerNumber:clean(data.customerNumber),
    projectName:clean(data.projectName)||"Individueller Auftrag",
    contactPerson:clean(data.contactPerson),
    addressLines:lines(data.address),
    positions:positions.map((position,index)=>({
      position:index+1,
      description:clean(position.description)||"Individuelle Anfertigung",
      quantity:Number(position.quantity||1),
      unit:clean(position.unit)||"Stk.",
      unitPrice:Number(position.unitPrice??position.total??0),
      total:Number(position.total??(Number(position.unitPrice||0)*Number(position.quantity||1)))
    })),
    total:Number(data.total??positions.reduce((sum,position)=>sum+Number(position.total??(Number(position.unitPrice||0)*Number(position.quantity||1))),0)),
    intro:clean(data.intro)||"Vielen Dank für Ihre Anfrage. Gern biete ich Ihnen folgende Leistung an:",
    notes:(Array.isArray(data.notes)?data.notes:[]).map(clean).filter(Boolean),
    closing:clean(data.closing)||"Vielen Dank für Ihr Interesse. Ich freue mich auf Ihren Auftrag."
  };
}

export function offerPdfFilename(data){
  const normalized=normalizeOffer(data);
  return `Angebot_${safeFilePart(normalized.offerNumber)}_${safeFilePart(normalized.addressLines[0]||"Kunde")}.pdf`;
}

export async function createOfferPdf(data,options={}){
  const pdfLib=options.pdfLib||globalThis.PDFLib;
  if(!pdfLib)throw new Error("PDF-Bibliothek ist nicht geladen.");
  const {PDFDocument,StandardFonts,rgb}=pdfLib;
  const backgroundBytes=options.backgroundBytes||await (async()=>{
    const response=await fetch(options.backgroundUrl||OFFER_PDF_BACKGROUND_URL,{cache:"force-cache"});
    if(!response.ok)throw new Error(`Briefpapier konnte nicht geladen werden (${response.status}).`);
    return new Uint8Array(await response.arrayBuffer());
  })();
  const backgroundDoc=await PDFDocument.load(backgroundBytes);
  const pdf=await PDFDocument.create();
  pdf.setTitle(`Angebot ${clean(data.offerNumber)}`);
  pdf.setAuthor("Daniel's Laser Art");
  pdf.setCreator("Daniels Laser Art Kalkulator");
  const regular=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif=await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold=await pdf.embedFont(StandardFonts.TimesRomanBold);
  const ink=rgb(0.09,0.075,0.06),muted=rgb(0.34,0.32,0.29),gold=rgb(0.56,0.39,0.12),soft=rgb(0.94,0.92,0.88),line=rgb(0.75,0.72,0.67);
  const layout=OFFER_PDF_LAYOUT,offer=normalizeOffer(data);
  const pages=[];

  async function addPage(first=false){
    let page;
    if(first){
      [page]=await pdf.copyPages(backgroundDoc,[0]);
      pdf.addPage(page);
    }else page=pdf.addPage([mm(layout.pageWidthMm),mm(layout.pageHeightMm)]);
    page.drawLine({start:{x:0,y:page.getHeight()-mm(layout.foldMarkYMm)},end:{x:mm(layout.foldMarkLengthMm),y:page.getHeight()-mm(layout.foldMarkYMm)},thickness:0.55,color:gold,opacity:0.72});
    if(!first){
      drawTopText(page,`Angebot ${offer.offerNumber}`,{x:mm(layout.contentLeftMm),top:mm(17),size:9,font:bold,color:muted});
      drawRightTopText(page,"Daniel's Laser Art",{right:mm(layout.contentRightMm),top:mm(17),size:8.5,font:serifBold,color:gold});
    }
    pages.push(page);
    return page;
  }

  const first=await addPage(true);
  drawTopText(first,"Daniel's Laser Art | Augasse 12 | 08393 Meerane",{x:mm(layout.contentLeftMm),top:mm(layout.senderTopMm),size:6.7,font:regular,color:muted,maxWidth:mm(layout.addressWidthMm)});
  const addressText=offer.addressLines.length?offer.addressLines.join("\n"):"";
  drawTopText(first,addressText,{x:mm(layout.contentLeftMm),top:mm(layout.addressTopMm),size:10.2,font:serif,color:ink,maxWidth:mm(layout.addressWidthMm),lineHeight:13.2});
  drawRightTopText(first,"Angebot",{right:mm(layout.documentTitleRightMm),top:mm(layout.documentTitleTopMm),size:19,font:serif,color:ink});
  drawRightTopText(first,offer.offerNumber,{right:mm(layout.documentTitleRightMm),top:mm(56),size:9.5,font:bold,color:muted});

  const detailItems=[
    ["Betreff",offer.projectName],
    ["Angebotsnummer",offer.offerNumber],
    ["Angebotsdatum",offer.date],
    ["Gültig bis",offer.validUntil||"14 Tage"]
  ];
  if(offer.customerNumber)detailItems.splice(2,0,["Kundennummer",offer.customerNumber]);
  const detailWidth=(mm(layout.pageWidthMm-layout.contentLeftMm-layout.contentRightMm)-(detailItems.length-1)*mm(5))/detailItems.length;
  detailItems.forEach(([label,value],index)=>{
    const x=mm(layout.contentLeftMm)+index*(detailWidth+mm(5));
    drawTopText(first,label,{x,top:mm(layout.detailsTopMm),size:7.4,font:bold,color:muted,maxWidth:detailWidth});
    drawTopText(first,value,{x,top:mm(layout.detailsTopMm)+11,size:8.5,font:regular,color:ink,maxWidth:detailWidth,lineHeight:10});
  });

  let page=first;
  let yTop=mm(layout.tableTopMm);
  const left=mm(layout.contentLeftMm),right=mm(layout.pageWidthMm-layout.contentRightMm),contentWidth=right-left;
  const columns=[
    {key:"position",label:"Pos.",width:mm(11),align:"left"},
    {key:"description",label:"Beschreibung",width:mm(76),align:"left"},
    {key:"quantity",label:"Menge",width:mm(18),align:"right"},
    {key:"unit",label:"Einheit",width:mm(17),align:"left"},
    {key:"unitPrice",label:"Einzelpreis",width:mm(25),align:"right"},
    {key:"total",label:"Gesamt",width:mm(23),align:"right"}
  ];

  function drawTableHeader(target,top){
    target.drawRectangle({x:left,y:target.getHeight()-top-mm(8),width:contentWidth,height:mm(8),color:soft});
    let x=left;
    columns.forEach(column=>{
      const labelWidth=bold.widthOfTextAtSize(column.label,7.5);
      const tx=column.align==="right"?x+column.width-mm(2)-labelWidth:x+mm(2);
      drawTopText(target,column.label,{x:tx,top:top+mm(2.1),size:7.5,font:bold,color:ink});
      x+=column.width;
    });
    return top+mm(8);
  }

  async function newContinuationPage(){
    page=await addPage(false);
    yTop=drawTableHeader(page,mm(layout.continuationTopMm));
  }

  drawTopText(page,offer.intro,{x:left,top:yTop-mm(9),size:8.6,font:regular,color:ink,maxWidth:contentWidth,lineHeight:11});
  yTop=drawTableHeader(page,yTop);
  for(const position of offer.positions){
    const descriptionLines=wrapText(position.description,regular,8.1,columns[1].width-mm(4));
    const rowHeight=Math.max(mm(9),descriptionLines.length*10+mm(4));
    if(yTop+rowHeight>mm(layout.footerTopMm-8))await newContinuationPage();
    const values={
      position:`${position.position}.`,
      description:position.description,
      quantity:quantity(position.quantity),
      unit:position.unit,
      unitPrice:money(position.unitPrice),
      total:money(position.total)
    };
    let x=left;
    columns.forEach(column=>{
      const value=values[column.key];
      const wrapped=column.key==="description"?descriptionLines:[value];
      wrapped.forEach((text,index)=>{
        const textWidth=regular.widthOfTextAtSize(text,8.1);
        const tx=column.align==="right"?x+column.width-mm(2)-textWidth:x+mm(2);
        drawTopText(page,text,{x:tx,top:yTop+mm(2.4)+index*10,size:8.1,font:regular,color:ink});
      });
      x+=column.width;
    });
    page.drawLine({start:{x:left,y:page.getHeight()-yTop-rowHeight},end:{x:right,y:page.getHeight()-yTop-rowHeight},thickness:0.45,color:line});
    yTop+=rowHeight;
  }

  if(yTop+mm(46)>mm(layout.footerTopMm))await newContinuationPage();
  page.drawLine({start:{x:mm(136),y:page.getHeight()-yTop-mm(2)},end:{x:right,y:page.getHeight()-yTop-mm(2)},thickness:0.9,color:gold});
  drawTopText(page,"Gesamt",{x:mm(150),top:yTop+mm(4),size:10,font:bold,color:ink});
  drawRightTopText(page,money(offer.total),{right:mm(layout.contentRightMm),top:yTop+mm(3),size:13,font:bold,color:gold});
  yTop+=mm(15);
  const defaultNotes=[
    "Dieses Angebot ist 14 Tage ab dem Ausstellungsdatum gültig.",
    "Gemäß § 19 UStG wird aufgrund der Kleinunternehmerregelung keine Umsatzsteuer erhoben."
  ];
  for(const note of [...defaultNotes,...offer.notes]){
    const noteLines=wrapText(note,regular,8.2,contentWidth);
    const height=noteLines.length*10+mm(2);
    if(yTop+height>mm(layout.footerTopMm-4)){await newContinuationPage();yTop+=mm(3)}
    drawTopText(page,note,{x:left,top:yTop,size:8.2,font:regular,color:ink,maxWidth:contentWidth,lineHeight:10});
    yTop+=height;
  }
  if(yTop+mm(13)>mm(layout.footerTopMm))await newContinuationPage();
  drawTopText(page,offer.closing,{x:left,top:yTop+mm(3),size:8.5,font:regular,color:ink,maxWidth:contentWidth,lineHeight:11});

  const totalPages=pages.length;
  pages.forEach((current,index)=>{
    const footerTop=mm(layout.footerTopMm);
    current.drawLine({start:{x:left,y:current.getHeight()-footerTop},end:{x:right,y:current.getHeight()-footerTop},thickness:0.55,color:gold});
    const footer=OFFER_FOOTER_LAYOUT;
    const drawFooterColumn=(x,width,heading,content)=>{
      drawTopText(current,heading,{x:mm(x),top:mm(footer.footerTopY),size:footer.headingFontSize,font:bold,color:muted,maxWidth:mm(width)});
      content.forEach((text,lineIndex)=>{
        drawTopText(current,text,{
          x:mm(x),
          top:mm(footer.footerTopY+(lineIndex+1)*footer.lineHeightMm),
          size:footer.textFontSize,
          font:regular,
          color:muted,
          maxWidth:mm(width)
        });
      });
    };
    drawFooterColumn(footer.leftColumnX,footer.leftColumnWidthMm,"Daniel's Laser Art",[
      "Augasse 12",
      "08393 Meerane",
      "Steuernummer: 227/227/03573",
      "Inhaber: Daniel Häßler"
    ]);
    drawFooterColumn(footer.contactColumnX,footer.contactColumnWidthMm,"Kontakt",[
      "Telefon: 015147906749",
      "E-Mail: Daniels.laser.art@gmail.com"
    ]);
    drawFooterColumn(footer.bankColumnX,footer.bankColumnWidthMm,"Bankverbindung",[
      "Bank: C24 Bank",
      "IBAN: DE07 5002 4024 7016 9162 31",
      "BIC: DEFF DEFF XXX",
      "Kontoinhaber: Daniel Häßler"
    ]);
    drawRightTopText(current,`Seite ${index+1} von ${totalPages}`,{right:mm(footer.pageNumberRightMm),top:mm(footer.pageNumberTopY),size:footer.textFontSize,font:regular,color:muted});
  });
  return pdf.save({useObjectStreams:true});
}

export function downloadOfferPdf(bytes,filename){
  const blob=new Blob([bytes],{type:"application/pdf"});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");
  anchor.href=url;anchor.download=filename;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
