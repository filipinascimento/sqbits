import unittest
from material_normalization import normalize

class CompositionAliases(unittest.TestCase):
    def test_true_aliases(self):
        for s in ['Al','aluminum','aluminium','Aluminum (Al)','aluminium (Al) electrodes','Al films','high-purity aluminum','nominally pure Al','100 nm Al film']:
            self.assertEqual(normalize(s,'material').value,'Al',s)
        for s in ['niobium','Nb','Niobium (Nb).','Nb thin film']:
            self.assertEqual(normalize(s,'material').value,'Nb',s)
        for s in ['silicon','Si','high resistivity silicon','high-resistivity intrinsic Si (100)','Si(111)','500-µm thick Si substrate']:
            self.assertEqual(normalize(s,'substrate').value,'Silicon',s)
        for s in ['Sapphire','sapphire substrate','c-plane sapphire (Al₂O₃)','Al2O3 (sapphire) substrate.']:
            self.assertEqual(normalize(s,'substrate').value,'Sapphire',s)
    def test_material_distinctions(self):
        for s,want in [('aluminum nitride','AlN'),('Al₂O₃','Al2O3'),('AlOx','AlOx'),('NbTiN thin film','NbTiN'),('NbN film','NbN'),('granular aluminum (grAl)','grAl'),('single-phase α-Ta (tantalum)','α-Ta'),('β-Ta','β-Ta'),('Al-AlOx-Al','Al/AlOx/Al'),('Nb/Al2O3/Nb','Nb/Al2O3/Nb')]:
            self.assertEqual(normalize(s,'material').value,want,s)
        for s in ['Al film with Nb','Al (6061)','oxygen-doped Al','not aluminum','aluminum or niobium','InAs NW contacted by NbTiN','Mo0.76Ge0.24','transmon qubit']:
            self.assertEqual(normalize(s,'material').rule,'unresolved',s)
    def test_substrate_distinctions_and_missing_evidence(self):
        for s,want in [('SiO₂','Silicon dioxide / silica'),('SiC','Silicon carbide'),('oxidized Si wafer','Oxidized silicon'),('Si/SiO2 substrate','Si/SiO2'),('SiO2/Si','SiO2/Si'),('silicon-on-insulator (SOI)','Silicon on insulator'),('Al2O3','Al2O3 (phase unspecified)'),('α-Al2O3','α-Al2O3')]:
            self.assertEqual(normalize(s,'substrate').value,want,s)
        for s in ['silicon or sapphire','Not reported.','Unknown','500um','dielectric substrate','a-Al2O3','α-quartz (SiO₂), used as a proxy for amorphous silica','Si/SiGe heterostructure']:
            self.assertEqual(normalize(s,'substrate').rule,'unresolved',s)
if __name__=='__main__':unittest.main()
