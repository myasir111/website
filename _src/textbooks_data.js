// "From the textbooks" for each Lab lesson: what standard school, A-level and university texts
// add to the lesson, and where to read more. Every result here was checked numerically (Nov 2026).
// Maths: \( inline \), $$ display $$.
module.exports = {
  'sines-and-cosines': {
    adds: [
      ['The harmonic form', 'A-level maths writes the same result as \\(a\\cos\\theta+b\\sin\\theta=R\\sin(\\theta+\\alpha)\\), with \\(R=\\sqrt{a^2+b^2}\\) and \\(\\tan\\alpha=a/b\\). It is this lesson’s \\(c\\) and \\(\\varphi\\) under other names.'],
      ['Circular motion, seen from the side', 'University physics texts introduce simple harmonic motion exactly this way: the shadow of a point on a turning circle. It is why the same sine turns up again in the physics track, in a mass on a spring.'],
    ],
    read: [
      'A-level Mathematics, Pure: trigonometric identities and the R sin(θ + α) form',
      'K. A. Stroud and D. J. Booth, Engineering Mathematics (Palgrave): trigonometry',
      'D. Halliday, R. Resnick and J. Walker, Fundamentals of Physics (Wiley): ch. 15, Oscillations',
    ],
  },
  'build-a-signal': {
    adds: [
      ['Parseval’s theorem: the overall level from the harmonics', 'Square every harmonic’s peak, halve it, add them up, and you get the mean square of the whole signal: $$x_{\\text{rms}}^2=a_0^2+\\sum_{n\\ge1}\\frac{c_n^2}{2}$$ For a square wave of height 1, \\(\\sum_{n\\ \\text{odd}}\\tfrac12\\big(\\tfrac{4}{\\pi n}\\big)^2=1\\), which is its RMS squared. This is how an analyser’s overall RMS matches the sum of its lines.'],
    ],
    read: [
      'K. A. Stroud and D. J. Booth, Engineering Mathematics (Palgrave): Fourier series',
      'E. Kreyszig, Advanced Engineering Mathematics (Wiley): ch. 11, Fourier analysis',
      'A. V. Oppenheim and A. S. Willsky, Signals and Systems (Prentice Hall): ch. 3, Fourier series',
      'R. B. Randall, Vibration-based Condition Monitoring (Wiley)',
    ],
  },
  'why-evens-vanish': {
    adds: [
      ['Even and odd functions', 'Textbooks meet a second symmetry first. If \\(f(-t)=f(t)\\) (even), every sine term vanishes: \\(b_n=0\\). If \\(f(-t)=-f(t)\\) (odd), every cosine vanishes: \\(a_n=0\\). That one depends on where you put \\(t=0\\). The half-turn symmetry in this lesson doesn’t: it removes the even harmonics wherever the record starts, which is why it is the one that matters on a machine.'],
    ],
    read: [
      'E. Kreyszig, Advanced Engineering Mathematics (Wiley): ch. 11, even and odd functions, half-range expansions',
      'K. A. Stroud and D. J. Booth, Engineering Mathematics (Palgrave): Fourier series',
      'R. B. Randall, Vibration-based Condition Monitoring (Wiley)',
    ],
  },
  'fft-by-hand': {
    adds: [
      ['Why it is called fast', 'Computed straight from the formula, \\(N\\) lines from \\(N\\) samples take about \\(N^2\\) multiplications. The FFT (Cooley and Tukey, 1965) splits the sum in halves again and again and needs about \\(\\tfrac N2\\log_2N\\). For 1024 samples that is 5120 instead of about a million: roughly 200 times faster, with exactly the same answer.'],
    ],
    read: [
      'S. W. Smith, The Scientist and Engineer’s Guide to Digital Signal Processing: ch. 8 (the DFT) and ch. 12 (the FFT), free online',
      'E. O. Brigham, The Fast Fourier Transform and Its Applications (Prentice Hall)',
      'J. W. Cooley and J. W. Tukey (1965), An algorithm for the machine calculation of complex Fourier series, Mathematics of Computation 19',
    ],
  },
  'leakage-and-windows': {
    adds: [
      ['Two corrections, not one', 'A Hann window halves a tone’s peak, so analysers multiply by 2 to read amplitudes. But it also widens every line to an effective 1.5 bins (its noise bandwidth), so for the energy in a band (overall RMS, or broadband noise) the right factor is \\(1/\\sqrt{0.375}\\approx1.63\\), not 2. Mixing the two is a common reason an overall level disagrees with the sum of the peaks.'],
    ],
    read: [
      'F. J. Harris (1978), On the use of windows for harmonic analysis with the discrete Fourier transform, Proceedings of the IEEE 66(1)',
      'A. Brandt, Noise and Vibration Analysis: Signal Analysis and Experimental Procedures (Wiley)',
      'S. W. Smith, The Scientist and Engineer’s Guide to Digital Signal Processing: ch. 9, free online',
    ],
  },
  'wavelets': {
    adds: [
      ['The limit has a name', 'The fixed area of every mark is the time–frequency uncertainty principle (Gabor, 1946): measured by their standard deviations, \\(\\sigma_t\\,\\sigma_f\\ge\\frac{1}{4\\pi}\\). A Gaussian shape reaches the limit exactly, which is why the Morlet wavelet is built from one. The 0.88 in this lesson is the same limit, measured across the half-height width instead.'],
    ],
    read: [
      'P. S. Addison, The Illustrated Wavelet Transform Handbook (CRC Press)',
      'S. Mallat, A Wavelet Tour of Signal Processing (Academic Press)',
      'C. Torrence and G. P. Compo (1998), A practical guide to wavelet analysis, Bulletin of the American Meteorological Society 79',
      'D. Gabor (1946), Theory of communication, Journal of the IEE 93',
    ],
  },
  'sidebands': {
    adds: [
      ['How wide a family of sidebands gets', 'Communication textbooks give Carson’s rule for a timing wobble of index \\(\\beta\\) at \\(f_m\\): almost all the power (about 98% or more) sits within \\(\\pm(\\beta+1)\\) sidebands, a total width of \\(2(\\beta+1)f_m\\). So a wide family of sidebands points to a large timing wobble; a wobble in size alone gives one pair.'],
    ],
    read: [
      'R. B. Randall, Vibration-based Condition Monitoring (Wiley): gears and sidebands',
      'S. Haykin, Communication Systems (Wiley): amplitude and frequency modulation, Bessel functions',
      'A. V. Oppenheim and A. S. Willsky, Signals and Systems (Prentice Hall): modulation',
    ],
  },
  'mass-on-a-spring': {
    adds: [
      ['The spring’s own mass', 'A heavy spring moves too. Its tip moves fully and its fixed end not at all, and an energy argument (Rayleigh) gives about a third of its mass to add: $$f_n\\approx\\frac{1}{2\\pi}\\sqrt{\\frac{k}{m+m_s/3}}$$ A-level questions sometimes give the spring’s mass for this reason.'],
      ['What the lesson already takes from them', 'Maximum speed \\(\\omega A\\) and acceleration \\(\\omega^2A\\) (A-level), energy that only swaps (university physics), Rayleigh’s method, springs in parallel and series, and the static-deflection formula with its rubber-mount caveat (vibration textbooks).'],
    ],
    read: [
      'AQA A-level Physics (7408) specification: 3.6.1.2 and 3.6.1.3, simple harmonic motion and systems',
      'OpenStax, University Physics Volume 1: ch. 15, Oscillations, free online',
      'S. S. Rao, Mechanical Vibrations (Pearson): ch. 2, free vibration of single-degree-of-freedom systems',
      'D. J. Inman, Engineering Vibration (Pearson): ch. 1',
      'C. M. Harris (ed.), Harris’ Shock and Vibration Handbook (McGraw-Hill): ch. 2, basic vibration theory',
    ],
  },
  'plates': {
    adds: [
      ['Chladni’s law', 'For round plates, acoustics textbooks give an old rule of thumb from Chladni’s own measurements: with \\(m\\) nodal diameters and \\(n\\) nodal circles, $$f\\approx C\\,(m+2n)^2$$ The busier the pattern, the higher the note, which is what the lesson’s shortening bending wave predicts.'],
      ['Why fine powder does the opposite', 'Very light powder gathers at the places that move most, not on the lines. Faraday showed in 1831 that air currents over the shaking plate carry it there; heavy grains like sand are too heavy for the air to move.'],
    ],
    read: [
      'T. D. Rossing and N. H. Fletcher, The Physics of Musical Instruments (Springer): ch. 3, vibrations of plates',
      'A. W. Leissa, Vibration of Plates, NASA SP-160 (1969): free online, frequencies for every common edge condition',
      'S. Timoshenko and S. Woinowsky-Krieger, Theory of Plates and Shells (McGraw-Hill): the plate equation',
      'D. J. Ewins, Modal Testing: Theory, Practice and Application (Research Studies Press): choosing measurement points',
      'OpenStax, University Physics Volume 1: ch. 16, standing waves, free online',
    ],
  },
};
