// A typographic rendition of the wordmark in the supplied reference images.
// Kept as text so it remains sharp and self-contained in the offline preview.
export function BrandMark({education=true}:{education?:boolean}){
 return <><span className="cc-wordmark" aria-hidden="true"><span>Christian</span><span>Concern</span></span>{education&&<><span className="brand-divider" aria-hidden="true"/><span className="brand-education">Education</span></>}</>;
}
